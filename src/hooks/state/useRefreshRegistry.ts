import { useRef, useCallback } from 'react';

export interface UseRefreshRegistryReturn {
  registerRefreshFunction: (pageId: string, refreshFn: () => Promise<void>) => void;
  unregisterRefreshFunction: (pageId: string) => void;
  executeAllRefreshFunctions: () => Promise<PromiseSettledResult<void>[]>;
  getRegisteredCount: () => number;
}

/**
 * Custom hook for managing a registry of page refresh functions
 */
export function useRefreshRegistry(): UseRefreshRegistryReturn {
  const refreshFunctionsRef = useRef<Map<string, () => Promise<void>>>(new Map());

  /**
   * Register a refresh function for a specific page
   */
  const registerRefreshFunction = useCallback((pageId: string, refreshFn: () => Promise<void>) => {
    refreshFunctionsRef.current.set(pageId, refreshFn);
  }, []);

  /**
   * Unregister a refresh function for a specific page
   */
  const unregisterRefreshFunction = useCallback((pageId: string) => {
    refreshFunctionsRef.current.delete(pageId);
  }, []);

  /**
   * Execute all registered refresh functions
   */
  const executeAllRefreshFunctions = useCallback(async (): Promise<PromiseSettledResult<void>[]> => {
    const functionsToExecute = Array.from(refreshFunctionsRef.current.values());
    const refreshPromises = functionsToExecute.map(fn => fn());
    return await Promise.allSettled(refreshPromises);
  }, []);

  /**
   * Get the count of registered refresh functions
   */
  const getRegisteredCount = useCallback((): number => {
    return refreshFunctionsRef.current.size;
  }, []);

  return {
    registerRefreshFunction,
    unregisterRefreshFunction,
    executeAllRefreshFunctions,
    getRegisteredCount
  };
}