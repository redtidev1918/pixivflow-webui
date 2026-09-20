import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { translateErrorCode, extractErrorInfo } from '../../../utils/errorCodeTranslator';
import { QUERY_KEYS } from '../../../constants';
import { isAuthenticated } from '../../../utils/authUtils';
import { useAuth } from '../../../hooks/useAuth';
import { useLoginPolling } from '../../../hooks/useLoginPolling';
import { useInteractiveLogin } from '../../../hooks/useInteractiveLogin';

/**
 * Hook for managing login flow
 * Handles login mode selection, login steps, polling, and navigation
 */
export function useLoginFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<'interactive' | 'token'>('interactive');
  const [loginStep, setLoginStep] = useState(0);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  // Check if already logged in
  const { data: authStatus, isLoading: authStatusLoading, refetch: refetchAuthStatus } = useQuery({
    queryKey: QUERY_KEYS.AUTH_STATUS,
    queryFn: () => api.getAuthStatus(),
    retry: false,
    staleTime: 0, // No cache - always fetch fresh data
    refetchOnMount: true, // Always refetch when component mounts
    refetchInterval: false,
  });

  // Get config to read proxy settings
  const { data: configData } = useQuery({
    queryKey: QUERY_KEYS.CONFIG,
    queryFn: () => api.getConfig(),
  });

  // Use auth hook
  const {
    loginWithTokenAsync,
    isLoggingInWithToken,
  } = useAuth();

  // Helper to check if authenticated from API response
  const checkAuth = useCallback((response: unknown): boolean => {
    const authenticated = isAuthenticated(response);
    console.log('[Login] Auth check:', { authenticated, response });
    return authenticated;
  }, []);

  // Handle successful login
  const handleLoginSuccess = useCallback(async () => {
    setPollingEnabled(false);
    setLoginStep(2);
    
    message.loading({ content: '✅ 登录成功，正在验证登录状态...', key: 'login-success', duration: 0 });
    
    // Wait for backend config to refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let authenticated = false;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await refetchAuthStatus();
        console.log(`[Login] Auth status check (attempt ${attempt + 1}/${maxRetries}):`, result);
        
        if (checkAuth(result)) {
          authenticated = true;
          console.log('[Login] Authentication confirmed');
          break;
        }
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[Login] Auth status check error (attempt ${attempt + 1}/${maxRetries}):`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    message.destroy('login-success');
    
    if (authenticated) {
      console.log('[Login] Authentication confirmed, navigating to dashboard...');
      message.success('✅ 登录成功！正在跳转到 Dashboard...', 2);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.href = '/dashboard';
    } else {
      console.warn('[Login] Auth status not confirmed after retries');
      message.warning('登录状态验证失败，请手动刷新页面或点击"检查登录状态"按钮', 4);
    }
  }, [refetchAuthStatus, checkAuth]);

  // Start/stop polling helpers
  const startPolling = useCallback(() => {
    setPollingEnabled(true);
  }, []);

  const stopPolling = useCallback(() => {
    setPollingEnabled(false);
  }, []);

  // Wrapper for refetchAuthStatus to match expected type
  const refetchAuthStatusWrapper = useCallback(async (): Promise<unknown> => {
    const result = await refetchAuthStatus();
    return result;
  }, [refetchAuthStatus]);

  // Use login polling hook
  useLoginPolling({
    enabled: pollingEnabled,
    onAuthenticated: () => {
      handleLoginSuccess();
    },
    refetchAuthStatus: refetchAuthStatusWrapper,
    isAuthenticated: checkAuth,
  });

  // Use interactive login hook
  const { handleInteractiveLogin, handleCheckStatus } = useInteractiveLogin({
    onLoginSuccess: () => setLoginStep(2),
    refetchAuthStatus: refetchAuthStatusWrapper,
    isAuthenticated: checkAuth,
    startPolling,
    stopPolling,
  });

  // Handle login
  const handleLogin = useCallback(async (values?: { refreshToken?: string }) => {
    setLoginStep(1);
    
    // Handle token login mode
    if (loginMode === 'token') {
      const refreshToken = values?.refreshToken;
      
      if (!refreshToken || refreshToken.trim() === '') {
        message.error('请输入 refreshToken');
        setLoginStep(0);
        return;
      }
      
      try {
        await loginWithTokenAsync(refreshToken.trim());
        handleLoginSuccess();
      } catch (error) {
        const { errorCode, message: errorMessage } = extractErrorInfo(error);
        setLoginStep(0);
        // 确保错误消息是字符串，不是对象
        const safeErrorMessage = typeof errorMessage === 'string' 
          ? errorMessage 
          : (typeof errorMessage === 'object' && errorMessage !== null 
              ? JSON.stringify(errorMessage) 
              : String(errorMessage || t('AUTH_LOGIN_FAILED')));
        if (errorCode) {
          message.error(translateErrorCode(errorCode, t, undefined, safeErrorMessage || t('AUTH_LOGIN_FAILED')));
        } else {
          message.error(safeErrorMessage || t('AUTH_LOGIN_FAILED'));
        }
      }
      return;
    }
    
    // Interactive mode
    try {
      await handleInteractiveLogin(configData);
    } catch (error) {
      const { errorCode, message: errorMessage } = extractErrorInfo(error);
      setLoginStep(0);
      // 确保错误消息是字符串，不是对象
      const safeErrorMessage = typeof errorMessage === 'string' 
        ? errorMessage 
        : (typeof errorMessage === 'object' && errorMessage !== null 
            ? JSON.stringify(errorMessage) 
            : String(errorMessage || t('AUTH_LOGIN_FAILED')));
      if (errorCode) {
        message.error(translateErrorCode(errorCode, t, undefined, safeErrorMessage || t('AUTH_LOGIN_FAILED')));
      } else {
        message.error(safeErrorMessage || t('AUTH_LOGIN_FAILED'));
      }
    }
  }, [loginMode, loginWithTokenAsync, handleLoginSuccess, handleInteractiveLogin, configData, t]);

  const isLoggingIn = pollingEnabled || loginStep === 1;

  return {
    // State
    loginMode,
    loginStep,
    isLoggingIn,
    isLoggingInWithToken,
    authStatusLoading,
    authStatus,
    isAuthenticated: checkAuth,
    
    // Actions
    setLoginMode,
    handleLogin,
    handleCheckStatus,
    
    // Navigation
    navigate,
  };
}
