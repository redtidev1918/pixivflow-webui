/**
 * Tests for uiStore
 */

import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../../stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset the module-level singleton deterministically (zustand keeps
    // state across tests) and wipe its persistence entry.
    useUIStore.setState({
      theme: 'auto',
      sidebarCollapsed: false,
      language: 'zh-CN',
      compactMode: false,
      tablePageSize: 20,
    });
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.theme).toBe('auto');
      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.language).toBe('zh-CN');
      expect(result.current.compactMode).toBe(false);
      expect(result.current.tablePageSize).toBe(20);
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should set theme to auto', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
        result.current.setTheme('auto');
      });

      expect(result.current.theme).toBe('auto');
    });
  });

  describe('Sidebar', () => {
    it('should toggle sidebar collapsed state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.sidebarCollapsed).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed state directly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.setSidebarCollapsed(false);
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });
  });

  describe('setLanguage', () => {
    it('should set language to English', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setLanguage('en-US');
      });

      expect(result.current.language).toBe('en-US');
    });

    it('should set language to Chinese', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setLanguage('zh-CN');
      });

      expect(result.current.language).toBe('zh-CN');
    });
  });

  describe('setCompactMode', () => {
    it('should enable compact mode', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setCompactMode(true);
      });

      expect(result.current.compactMode).toBe(true);
    });

    it('should disable compact mode', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setCompactMode(true);
        result.current.setCompactMode(false);
      });

      expect(result.current.compactMode).toBe(false);
    });
  });

  describe('setTablePageSize', () => {
    it('should set table page size', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTablePageSize(50);
      });

      expect(result.current.tablePageSize).toBe(50);
    });

    it('should update table page size multiple times', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTablePageSize(10);
      });
      expect(result.current.tablePageSize).toBe(10);

      act(() => {
        result.current.setTablePageSize(100);
      });
      expect(result.current.tablePageSize).toBe(100);
    });
  });

  describe('Persistence', () => {
    it('should persist UI state to localStorage', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.setSidebarCollapsed(true);
        result.current.setLanguage('en-US');
        result.current.setCompactMode(true);
        result.current.setTablePageSize(50);
      });

      const stored = localStorage.getItem('ui-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.theme).toBe('dark');
      expect(parsed.state.sidebarCollapsed).toBe(true);
      expect(parsed.state.language).toBe('en-US');
      expect(parsed.state.compactMode).toBe(true);
      expect(parsed.state.tablePageSize).toBe(50);
    });

    it('should restore UI state from localStorage', () => {
      // Set initial state
      const { result: result1 } = renderHook(() => useUIStore());
      act(() => {
        result1.current.setTheme('dark');
        result1.current.setSidebarCollapsed(true);
        result1.current.setLanguage('en-US');
      });

      // Create new hook instance (simulating page reload)
      const { result: result2 } = renderHook(() => useUIStore());

      expect(result2.current.theme).toBe('dark');
      expect(result2.current.sidebarCollapsed).toBe(true);
      expect(result2.current.language).toBe('en-US');
    });
  });

  describe('Multiple State Updates', () => {
    it('should handle multiple state updates correctly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('dark');
        result.current.toggleSidebar();
        result.current.setLanguage('en-US');
        result.current.setCompactMode(true);
        result.current.setTablePageSize(100);
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.sidebarCollapsed).toBe(true);
      expect(result.current.language).toBe('en-US');
      expect(result.current.compactMode).toBe(true);
      expect(result.current.tablePageSize).toBe(100);
    });
  });
});

