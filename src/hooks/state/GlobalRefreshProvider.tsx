// React Provider component for global refresh functionality
import { useCallback, useEffect, type ReactNode } from 'react';
import { GlobalRefreshContext, type GlobalRefreshContextType } from './GlobalRefreshContext';
import { useConnectionStatus } from './useConnectionStatus';
import { usePageVisibility } from './usePageVisibility';
import { useRefreshRegistry } from './useRefreshRegistry';
import { useRefreshTimer } from './useRefreshTimer';

interface GlobalRefreshProviderProps {
  children: ReactNode;
  defaultInterval?: number;
}

export function GlobalRefreshProvider({
  children,
  defaultInterval = 10000
}: GlobalRefreshProviderProps) {
  // Use specialized hooks
  const { connectionStatus, lastError, setConnectionStatus, updateConnectionState } = useConnectionStatus();
  const { isPageVisible } = usePageVisibility();
  const { registerRefreshFunction, unregisterRefreshFunction, executeAllRefreshFunctions, getRegisteredCount } = useRefreshRegistry();

  // Create execute refresh function
  const executeRefreshFunction = useCallback(async (): Promise<void> => {
    try {
      setConnectionStatus('checking');

      const results = await executeAllRefreshFunctions();
      const totalAttempts = results.length;
      const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
      const successCount = totalAttempts - failures.length;

      updateConnectionState(successCount, totalAttempts, failures);
    } catch (error) {
      console.error('Global refresh execution failed:', error);
      setConnectionStatus('error');
    }
  }, [setConnectionStatus, executeAllRefreshFunctions, updateConnectionState]);

  // Use refresh timer with the composed refresh function
  const {
    interval,
    isEnabled,
    isRefreshing,
    lastRefresh,
    changeInterval,
    toggleRefresh,
    setIsRefreshing,
    updateLastRefresh,
    formatInterval,
  } = useRefreshTimer(defaultInterval, executeRefreshFunction);

  // Setup timer on page visibility and registration changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (getRegisteredCount() > 0) {
        executeRefreshFunction().catch(() => {
          // Handle error silently
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [getRegisteredCount, executeRefreshFunction]);

  // Enhanced execute refresh with state management
  const executeRefresh = useCallback(async (): Promise<void> => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await executeRefreshFunction();
      updateLastRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, executeRefreshFunction, setIsRefreshing, updateLastRefresh]);

  const value: GlobalRefreshContextType = {
    interval,
    isEnabled,
    lastRefresh,
    isPageVisible,
    isRefreshing,
    connectionStatus,
    lastError,
    changeInterval,
    toggleRefresh,
    executeRefresh,
    formatInterval,
    registerRefreshFunction,
    unregisterRefreshFunction,
  };

  return (
    <GlobalRefreshContext.Provider value={value}>
      {children}
    </GlobalRefreshContext.Provider>
  );
}