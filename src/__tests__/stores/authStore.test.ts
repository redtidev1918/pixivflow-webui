/**
 * Tests for authStore
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Deterministic singleton reset independent of clearAuth internals
    useAuthStore.setState({
      isAuthenticated: false,
      userId: undefined,
      username: undefined,
      token: undefined,
      tokenExpiry: undefined,
    });
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userId).toBeUndefined();
      expect(result.current.username).toBeUndefined();
      expect(result.current.token).toBeUndefined();
      expect(result.current.tokenExpiry).toBeUndefined();
    });
  });

  describe('setAuth', () => {
    it('should set authentication state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuth({
          isAuthenticated: true,
          userId: '123',
          username: 'testuser',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userId).toBe('123');
      expect(result.current.username).toBe('testuser');
    });

    it('should partially update auth state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuth({
          userId: '123',
          username: 'testuser',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userId).toBe('123');
      expect(result.current.username).toBe('testuser');
    });

    it('should merge with existing state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuth({
          userId: '123',
          username: 'testuser',
        });
      });

      act(() => {
        result.current.setAuth({
          token: 'abc123',
        });
      });

      expect(result.current.userId).toBe('123');
      expect(result.current.username).toBe('testuser');
      expect(result.current.token).toBe('abc123');
    });
  });

  describe('clearAuth', () => {
    it('should clear authentication state', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuth({
          isAuthenticated: true,
          userId: '123',
          username: 'testuser',
          token: 'abc123',
        });
      });

      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.userId).toBeUndefined();
      expect(result.current.username).toBeUndefined();
      expect(result.current.token).toBeUndefined();
      expect(result.current.tokenExpiry).toBeUndefined();
    });
  });

  describe('setToken', () => {
    it('should set token and mark as authenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setToken('abc123');
      });

      expect(result.current.token).toBe('abc123');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should set token with expiry', () => {
      const { result } = renderHook(() => useAuthStore());
      const expiry = Date.now() + 3600000; // 1 hour from now

      act(() => {
        result.current.setToken('abc123', expiry);
      });

      expect(result.current.token).toBe('abc123');
      expect(result.current.tokenExpiry).toBe(expiry);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('checkTokenExpiry', () => {
    it('should return true if no token expiry is set', () => {
      const { result } = renderHook(() => useAuthStore());

      const isExpired = result.current.checkTokenExpiry();
      expect(isExpired).toBe(true);
    });

    it('should return false if token is not expired', () => {
      const { result } = renderHook(() => useAuthStore());
      const futureExpiry = Date.now() + 3600000; // 1 hour from now

      act(() => {
        result.current.setToken('abc123', futureExpiry);
      });

      const isExpired = result.current.checkTokenExpiry();
      expect(isExpired).toBe(false);
    });

    it('should return true if token is expired', () => {
      const { result } = renderHook(() => useAuthStore());
      const pastExpiry = Date.now() - 1000; // 1 second ago

      act(() => {
        result.current.setToken('abc123', pastExpiry);
      });

      const isExpired = result.current.checkTokenExpiry();
      expect(isExpired).toBe(true);
    });

    it('should return true if token expiry is exactly now', () => {
      const { result } = renderHook(() => useAuthStore());
      const now = Date.now();

      act(() => {
        result.current.setToken('abc123', now);
      });

      const isExpired = result.current.checkTokenExpiry();
      expect(isExpired).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should persist auth state to localStorage', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuth({
          isAuthenticated: true,
          userId: '123',
          username: 'testuser',
          token: 'abc123',
        });
      });

      const stored = localStorage.getItem('auth-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.isAuthenticated).toBe(true);
      expect(parsed.state.userId).toBe('123');
      expect(parsed.state.username).toBe('testuser');
      expect(parsed.state.token).toBe('abc123');
    });

    it('should restore auth state from localStorage', () => {
      // Set initial state
      const { result: result1 } = renderHook(() => useAuthStore());
      act(() => {
        result1.current.setAuth({
          isAuthenticated: true,
          userId: '123',
          username: 'testuser',
        });
      });

      // Create new hook instance (simulating page reload)
      const { result: result2 } = renderHook(() => useAuthStore());

      expect(result2.current.isAuthenticated).toBe(true);
      expect(result2.current.userId).toBe('123');
      expect(result2.current.username).toBe('testuser');
    });
  });
});

