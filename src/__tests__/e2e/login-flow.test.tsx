/**
 * E2E tests for login flow
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  api: {
    getAuthStatus: jest.fn(),
    login: jest.fn(),
    loginWithToken: jest.fn(),
  },
}));

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('E2E: Login Flow', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const renderLoginPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Password Login Flow', () => {
    it('should render login page', async () => {
      (api.getAuthStatus as jest.Mock).mockResolvedValue({
        data: {
          data: {
            isAuthenticated: false,
          },
        },
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByText('login.subtitle')).toBeInTheDocument();
      });
    });

    it('should show login form elements', async () => {
      (api.getAuthStatus as jest.Mock).mockResolvedValue({
        data: {
          data: {
            isAuthenticated: false,
          },
        },
      });

      renderLoginPage();

      await waitFor(() => {
        // The interactive-mode label appears in the radio button AND in the
        // marketing features list, so allow multiple matches.
        expect(screen.getAllByText('login.loginModeInteractive').length).toBeGreaterThan(0);
        expect(screen.getAllByText('login.loginModeToken').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Authentication Status', () => {
    it('should check authentication status on mount', async () => {
      (api.getAuthStatus as jest.Mock).mockResolvedValue({
        data: {
          data: {
            isAuthenticated: false,
          },
        },
      });

      renderLoginPage();

      await waitFor(() => {
        expect(api.getAuthStatus).toHaveBeenCalled();
      });
    });

    it('should redirect if already authenticated', async () => {
      (api.getAuthStatus as jest.Mock).mockResolvedValue({
        data: {
          data: {
            isAuthenticated: true,
            userId: '123',
            username: 'testuser',
          },
        },
      });

      renderLoginPage();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });
  });

  describe('Login Mode Switching', () => {
    it('should display password mode by default', async () => {
      (api.getAuthStatus as jest.Mock).mockResolvedValue({
        data: {
          data: {
            isAuthenticated: false,
          },
        },
      });

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getAllByText('login.loginModeInteractive').length).toBeGreaterThan(0);
      });
    });
  });
});

