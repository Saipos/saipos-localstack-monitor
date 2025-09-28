import { useCallback, useEffect, useRef } from 'react';

export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAbortSignal = useCallback(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { getAbortSignal, cancelRequest };
}