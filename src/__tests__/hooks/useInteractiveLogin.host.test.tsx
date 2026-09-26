/**
 * Tests for the host-bridge-driven interactive login path.
 *
 * A desktop host (Tauri webview) injects `window.pixivflowHost`; the UI must
 * then run `startHostLogin` -> `openLoginWindow` -> `completeHostLogin` instead
 * of letting the backend open a system browser via puppeteer.
 */

import React from 'react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { message } from 'antd';
import { useInteractiveLogin } from '../../hooks/useInteractiveLogin';
import { api } from '../../services/api';
import { getHostLoginBridge } from '../../utils/hostBridge';

jest.mock('../../services/api', () => ({
  api: {
    startHostLogin: jest.fn(),
    completeHostLogin: jest.fn(),
    login: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}_${JSON.stringify(params)}` : key,
  }),
}));

jest.mock('../../utils/hostBridge', () => ({
  getHostLoginBridge: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockGetHostLoginBridge = getHostLoginBridge as jest.MockedFunction<
  typeof getHostLoginBridge
>;

const HOST_SESSION = {
  loginId: 'login-session-1',
  authUrl: 'https://app-api.pixiv.net/web/v1/login?code_challenge=abc',
  redirectUri: 'https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback',
};

const HOST_LOGIN_SUCCESS = {
  data: {
    success: true,
    errorCode: 'AUTH_LOGIN_SUCCESS',
    data: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      user: { id: '1', name: 'tester' },
    },
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
};

describe('useInteractiveLogin — desktop host bridge', () => {
  let queryClient: QueryClient;
  let openLoginWindow: jest.Mock;
  let startPolling: jest.Mock;
  let stopPolling: jest.Mock;
  let onLoginSuccess: jest.Mock;
  let refetchAuthStatus: jest.Mock;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    openLoginWindow = jest.fn();
    startPolling = jest.fn();
    stopPolling = jest.fn();
    onLoginSuccess = jest.fn();
    refetchAuthStatus = jest.fn().mockResolvedValue({
      data: { data: { isAuthenticated: true } },
    });

    errorSpy = jest.spyOn(message, 'error').mockImplementation(() => undefined as never);

    jest.clearAllMocks();

    mockGetHostLoginBridge.mockReturnValue({
      openLoginWindow: openLoginWindow as unknown as (
        authUrl: string,
        redirectUri: string
      ) => Promise<{ code: string | null }>,
    });
    mockApi.startHostLogin.mockResolvedValue({
      data: { success: true, data: HOST_SESSION },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
    mockApi.completeHostLogin.mockResolvedValue(HOST_LOGIN_SUCCESS);
    refetchAuthStatus.mockResolvedValue({
      data: { data: { isAuthenticated: true } },
    });
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const renderInteractiveLogin = () =>
    renderHook(
      () =>
        useInteractiveLogin({
          onLoginSuccess,
          refetchAuthStatus,
          isAuthenticated: (response: unknown) =>
            Boolean(
              (response as { data?: { data?: { isAuthenticated?: boolean } } })
                ?.data?.data?.isAuthenticated
            ),
          startPolling,
          stopPolling,
        }),
      { wrapper }
    );

  it('detects the host bridge and runs startHostLogin -> openLoginWindow -> completeHostLogin in order', async () => {
    const callOrder: string[] = [];
    mockApi.startHostLogin.mockImplementation(async () => {
      callOrder.push('startHostLogin');
      return {
        data: { success: true, data: HOST_SESSION },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };
    });
    openLoginWindow.mockImplementation(async () => {
      callOrder.push('openLoginWindow');
      return { code: 'auth-code-123' };
    });
    mockApi.completeHostLogin.mockImplementation(async () => {
      callOrder.push('completeHostLogin');
      return HOST_LOGIN_SUCCESS;
    });

    const { result } = renderInteractiveLogin();

    await result.current.handleInteractiveLogin();

    expect(callOrder).toEqual([
      'startHostLogin',
      'openLoginWindow',
      'completeHostLogin',
    ]);

    // The bridge is called with the session URL + redirect URI from the backend.
    expect(openLoginWindow).toHaveBeenCalledTimes(1);
    expect(openLoginWindow).toHaveBeenCalledWith(
      HOST_SESSION.authUrl,
      HOST_SESSION.redirectUri
    );

    expect(mockApi.completeHostLogin).toHaveBeenCalledTimes(1);
    expect(mockApi.completeHostLogin).toHaveBeenCalledWith({
      loginId: HOST_SESSION.loginId,
      code: 'auth-code-123',
    });

    // Polling starts with the host window and stops once login succeeds.
    expect(startPolling).toHaveBeenCalled();
    expect(stopPolling).toHaveBeenCalled();
    // The backend (not the UI) opened the browser: puppeteer path untouched.
    expect(mockApi.login).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('treats { code: null } as a cancellation: no complete call, no error', async () => {
    openLoginWindow.mockResolvedValue({ code: null });

    const { result } = renderInteractiveLogin();

    await result.current.handleInteractiveLogin();

    expect(mockApi.startHostLogin).toHaveBeenCalledTimes(1);
    expect(openLoginWindow).toHaveBeenCalledTimes(1);
    expect(mockApi.completeHostLogin).not.toHaveBeenCalled();
    expect(mockApi.login).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(stopPolling).toHaveBeenCalled();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('exposes the waiting-for-authorization state while the host window is open', async () => {
    let resolveWindow: (value: { code: string | null }) => void = () => undefined;
    openLoginWindow.mockImplementation(
      () =>
        new Promise<{ code: string | null }>((resolve) => {
          resolveWindow = resolve;
        })
    );

    const { result } = renderInteractiveLogin();

    const loginPromise = result.current.handleInteractiveLogin();

    await waitFor(() => {
      expect(result.current.waitingForHostAuth).toBe(true);
    });

    resolveWindow({ code: null });
    await loginPromise;

    await waitFor(() => {
      expect(result.current.waitingForHostAuth).toBe(false);
    });
  });

  it('falls back to the backend puppeteer API when no host bridge is present', async () => {
    mockGetHostLoginBridge.mockReturnValue(null);
    mockApi.login.mockResolvedValue({
      data: { success: true, data: { refreshToken: 'refresh-token' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });

    const { result } = renderInteractiveLogin();

    await result.current.handleInteractiveLogin();

    expect(mockApi.login).toHaveBeenCalledWith('', '', false, undefined);
    expect(mockApi.startHostLogin).not.toHaveBeenCalled();
    expect(openLoginWindow).not.toHaveBeenCalled();
  });

  it('reports a host login failure through an error message and rethrows', async () => {
    mockApi.startHostLogin.mockRejectedValue(new Error('host session failed'));

    const { result } = renderInteractiveLogin();

    await expect(result.current.handleInteractiveLogin()).rejects.toThrow(
      'host session failed'
    );

    expect(openLoginWindow).not.toHaveBeenCalled();
    expect(mockApi.completeHostLogin).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
