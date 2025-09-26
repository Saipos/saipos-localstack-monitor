import { useState, useEffect, useRef, useCallback } from 'react';
import { REFRESH_INTERVALS } from '../types';

export function useRefreshInterval(
  refreshFunction: () => void | Promise<void>,
  defaultInterval: number = 10000
) {
  const [interval, setInterval] = useState(defaultInterval);
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const refreshFunctionRef = useRef(refreshFunction);

  // Atualiza a ref sempre que a função muda
  refreshFunctionRef.current = refreshFunction;

  // Page Visibility API - só uma vez
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Função estável para executar refresh
  const executeRefreshStable = useCallback(async () => {
    if (isRefreshing) return; // Evita múltiplas execuções simultâneas

    try {
      setIsRefreshing(true);
      await refreshFunctionRef.current();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Gerencia o timer do auto-refresh - SEM refreshFunction como dependência
  useEffect(() => {
    // Limpa timer anterior
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Só cria novo timer se estiver habilitado e página visível
    if (isEnabled && isPageVisible) {
      intervalRef.current = window.setInterval(() => {
        executeRefreshStable();
      }, interval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, isEnabled, isPageVisible]);

  const toggleRefresh = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const changeInterval = useCallback((newInterval: number) => {
    setInterval(newInterval);
  }, []);

  const formatInterval = useCallback((intervalMs: number): string => {
    const option = REFRESH_INTERVALS.find(opt => opt.value === intervalMs);
    return option ? option.label : `${intervalMs}ms`;
  }, []);

  return {
    interval,
    isEnabled,
    lastRefresh,
    isPageVisible,
    isRefreshing,
    changeInterval,
    toggleRefresh,
    formatInterval,
    executeRefresh: executeRefreshStable,
  };
}