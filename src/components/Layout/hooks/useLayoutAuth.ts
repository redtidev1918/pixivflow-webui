import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { QUERY_KEYS, REFRESH_INTERVALS } from '../../../constants';
import { isAuthenticated as checkAuth } from '../../../utils/authUtils';

/**
 * Hook for managing authentication in Layout
 */
export function useLayoutAuth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // Check authentication status
  const { data: authStatus } = useQuery({
    queryKey: QUERY_KEYS.AUTH_STATUS,
    queryFn: () => api.getAuthStatus(),
    retry: false,
    refetchInterval: REFRESH_INTERVALS.AUTH_STATUS, // Refetch every 30 seconds
  });

  // Helper to check if authenticated
  const isAuthenticated = (): boolean => {
    return checkAuth(authStatus);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Call logout API to clear token
      await api.logout();

      // Show success message
      message.success(t('layout.logoutSuccess'));

      // Force page reload to ensure clean state. This is more reliable than
      // clearing query cache and navigating, as it guarantees a fresh start.
      setTimeout(() => {
        window.location.href = '/login';
      }, 300); // Reduced delay for faster redirect
    } catch (error: unknown) {
      console.error('Logout failed:', error);
      message.error(t('layout.logoutFailed'));
      setIsLoggingOut(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setIsRefreshingToken(true);
      message.loading(t('layout.refreshingToken'), 0);

      await api.refreshToken();

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH_STATUS });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONFIG });

      message.destroy();
      message.success(t('layout.tokenRefreshed'));
    } catch (error: unknown) {
      console.error('Token refresh failed:', error);
      message.destroy();
      message.error(t('layout.tokenRefreshFailed'));
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleLogin = () => {
    navigate('/login', { replace: true });
  };

  return {
    isAuthenticated: isAuthenticated(),
    isLoggingOut,
    isRefreshingToken,
    handleLogin,
    handleLogout,
    handleRefreshToken,
  };
}

