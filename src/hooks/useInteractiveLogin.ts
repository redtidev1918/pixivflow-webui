import { useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { QUERY_KEYS } from '../constants';
import { getHostLoginBridge } from '../utils/hostBridge';

interface UseInteractiveLoginOptions {
  onLoginSuccess?: () => void;
  refetchAuthStatus: () => Promise<unknown>;
  isAuthenticated: (response: unknown) => boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook for handling interactive login.
 *
 * Two paths, in this order: a desktop host that injects the
 * `window.pixivflowHost` bridge completes the authorization in an app-owned
 * window; without one, the backend runs its own visible-browser (Puppeteer)
 * flow and this hook polls until the tokens land. There is no third path — a
 * shell that wants an in-app window implements the documented bridge.
 */
export function useInteractiveLogin({
  onLoginSuccess,
  refetchAuthStatus,
  isAuthenticated,
  startPolling,
  stopPolling,
}: UseInteractiveLoginOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isInteractiveLoginActiveRef = useRef<boolean>(false);
  const [waitingForHostAuth, setWaitingForHostAuth] = useState(false);

  // Handle successful login
  const handleLoginSuccess = useCallback(async () => {
    stopPolling();
    isInteractiveLoginActiveRef.current = false;
    setWaitingForHostAuth(false);
    
    // Show progress messages
    message.loading({ content: '✅ 登录成功，正在验证登录状态...', key: 'login-success', duration: 0 });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH_STATUS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONFIG });
    
    // Wait for backend config to refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for auth status to update before navigating
    let authenticated = false;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await refetchAuthStatus();
        console.log(`[InteractiveLogin] Auth status check (attempt ${attempt + 1}/${maxRetries}):`, result);
        
        if (isAuthenticated(result)) {
          authenticated = true;
          console.log('[InteractiveLogin] Authentication confirmed');
          break;
        }
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[InteractiveLogin] Auth status check error (attempt ${attempt + 1}/${maxRetries}):`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    message.destroy('login-success');
    
    if (authenticated) {
      console.log('[InteractiveLogin] Authentication confirmed, navigating to dashboard...');
      message.success('✅ 登录成功！正在跳转到 Dashboard...', 2);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.href = '/dashboard';
    } else {
      console.warn('[InteractiveLogin] Auth status not confirmed after retries');
      message.warning('登录状态验证失败，请手动刷新页面或点击"检查登录状态"按钮', 4);
    }
    
    onLoginSuccess?.();
  }, [stopPolling, queryClient, refetchAuthStatus, isAuthenticated, onLoginSuccess]);

  // Handle interactive login
  const handleInteractiveLogin = useCallback(async (configData?: { data?: { data?: { network?: { proxy?: { enabled?: boolean; [key: string]: unknown } } } } }) => {
    // Desktop host (e.g. Tauri webview): the host shows the Pixiv authorize
    // page in an in-app window and returns the authorization code.
    const hostBridge = getHostLoginBridge();

    if (hostBridge) {
      console.log('[InteractiveLogin] Using desktop host in-app login window...');

      setWaitingForHostAuth(true);
      isInteractiveLoginActiveRef.current = true;
      startPolling();

      let loginResult: { code: string | null };

      try {
        message.info(t('common.openingInAppLoginWindow'), 3);

        const { data } = await api.startHostLogin();
        const session = data?.data;

        if (!session?.loginId || !session?.authUrl || !session?.redirectUri) {
          throw new Error(t('common.cannotOpenLoginWindow'));
        }

        console.log('[InteractiveLogin] Host login session started, opening in-app window...');
        message.info(t('common.waitingForAuthInApp'), 5);

        loginResult = await hostBridge.openLoginWindow(
          session.authUrl,
          session.redirectUri
        );

        const code = loginResult?.code ?? null;

        if (!code) {
          // User closed the window or it timed out: cancellation, not an error.
          console.log('[InteractiveLogin] Host login window closed without authorization code');
          stopPolling();
          isInteractiveLoginActiveRef.current = false;
          setWaitingForHostAuth(false);
          return;
        }

        console.log('[InteractiveLogin] Authorization code received from host, completing login...');
        message.loading({ content: t('common.completingHostLogin'), key: 'login-progress', duration: 0 });

        await api.completeHostLogin({ loginId: session.loginId, code });

        message.destroy('login-progress');
        console.log('[InteractiveLogin] Host login completed');
      } catch (error) {
        setWaitingForHostAuth(false);
        stopPolling();
        isInteractiveLoginActiveRef.current = false;
        message.destroy('login-progress');

        const errorMessage = error instanceof Error ? error.message : t('common.unknown');
        console.error('[InteractiveLogin] Host login failed:', error);
        message.error(t('common.inAppLoginFailed', { error: errorMessage }), 4);
        throw error;
      }

      // The backend already exchanged the code and saved the tokens, so run the
      // confirmation/status-check path directly instead of waiting for polling.
      await handleLoginSuccess();
      return;
    }

    // No host: the backend opens a visible browser and we poll for the result.
    const username = '';
    const password = '';
    
    const proxy = configData?.data?.data?.network?.proxy?.enabled 
      ? configData.data.data.network.proxy 
      : undefined;
    
    stopPolling();
    
    isInteractiveLoginActiveRef.current = true;
    startPolling();
    console.log('[InteractiveLogin] Starting interactive login via backend API, polling will begin...');
    
    try {
      await api.login(username, password, false, proxy);
    } catch (error) {
      const apiError = error as { code?: string; message?: string };
      const isTimeout = apiError?.code === 'ECONNABORTED' || apiError?.message?.includes('timeout');
      
      if (isTimeout) {
        console.log('[InteractiveLogin] Interactive login API timeout, but continuing to poll for status...');
        message.info('正在等待浏览器登录完成，系统会自动检测登录状态...', 5);
        return;
      }
      
      stopPolling();
      isInteractiveLoginActiveRef.current = false;
      
      const errorMessage = apiError?.message || (error instanceof Error ? error.message : '未知错误');
      throw new Error(errorMessage);
    }
  }, [startPolling, stopPolling, handleLoginSuccess, t]);

  // Manual check login status
  const handleCheckStatus = useCallback(async () => {
    try {
      message.loading({ content: '正在检查登录状态...', key: 'checkStatus', duration: 0 });
      const result = await refetchAuthStatus();
      message.destroy('checkStatus');
      
      if (isAuthenticated(result)) {
        message.success('✅ 已登录，正在跳转...', 2);
        handleLoginSuccess();
      } else {
        message.info('尚未登录，请完成浏览器中的登录流程。系统会自动检测登录状态。', 4);
        if (!isInteractiveLoginActiveRef.current) {
          isInteractiveLoginActiveRef.current = true;
          startPolling();
        }
      }
    } catch (error) {
      message.destroy('checkStatus');
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      message.error('检查登录状态失败: ' + errorMessage, 4);
      console.error('[InteractiveLogin] Manual status check error:', error);
    }
  }, [refetchAuthStatus, isAuthenticated, handleLoginSuccess, startPolling]);

  return {
    handleInteractiveLogin,
    handleCheckStatus,
    isActive: isInteractiveLoginActiveRef.current,
    waitingForHostAuth,
  };
}

