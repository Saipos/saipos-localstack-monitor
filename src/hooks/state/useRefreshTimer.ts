import { useCallback, useEffect, useRef, useState } from 'react';
import { REFRESH_INTERVALS } from '../../types';

export interface UseRefreshTimerReturn {
  interval: number;
  isEnabled: boolean;
  isRefreshing: boolean;
  lastRefresh: Date;
  changeInterval: (interval: number) => void;
  toggleRefresh: () => void;
  setIsRefreshing: (refreshing: boolean) => void;
  updateLastRefresh: () => void;
  formatInterval: (intervalMs: number) => string;
  setupTimer: (pageVisible?: boolean) => void;
}

/**
 * Custom hook for managing refresh timer, intervals, and refresh state
 */
export function useRefreshTimer(
  defaultInterval: number = 10000,
  onExecuteRefresh?: () => Promise<void>
): UseRefreshTimerReturn {
  const [interval, setInterval] = useState(defaultInterval);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const intervalRef = useRef<number | null>(null);
  const currentIntervalRef = useRef(interval);
  const isRefreshingRef = useRef(false);
  const executeRefreshRef = useRef<(() => Promise<void>) | null>(null);

  // Update refs when states change
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    currentIntervalRef.current = interval > 0 ? interval : defaultInterval;
    if (interval !== currentIntervalRef.current) {
      setInterval(currentIntervalRef.current);
    }
  }, [interval, defaultInterval]);

  // Update executeRefreshRef when onExecuteRefresh changes
  useEffect(() => {
    executeRefreshRef.current = onExecuteRefresh || null;
  }, [onExecuteRefresh]);

  /**
   * Setup or clear timer based on conditions
   */
  const setupTimer = useCallback((pageVisible: boolean = true) => {
    // Clear existing timer
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only setup timer if enabled, page visible, and refresh function exists
    if (isEnabled && pageVisible && executeRefreshRef.current) {
      const currentInterval = currentIntervalRef.current;

      if (!currentInterval || currentInterval <= 0) {
        currentIntervalRef.current = defaultInterval;
        setInterval(defaultInterval);
        return;
      }

      intervalRef.current = window.setInterval(() => {
        if (executeRefreshRef.current && !isRefreshingRef.current) {
          executeRefreshRef.current();
        }
      }, currentInterval);
    }
  }, [isEnabled, defaultInterval]);

  /**
   * Toggle refresh state
   */
  const toggleRefresh = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  /**
   * Change refresh interval
   */
  const changeInterval = useCallback((newInterval: number) => {
    if (!newInterval || newInterval <= 0) return;
    setInterval(newInterval);
  }, []);

  /**
   * Update last refresh timestamp
   */
  const updateLastRefresh = useCallback(() => {
    setLastRefresh(new Date());
  }, []);

  /**
   * Format interval for display
   */
  const formatInterval = useCallback((intervalMs: number): string => {
    const option = REFRESH_INTERVALS.find(opt => opt.value === intervalMs);
    return option ? option.label : `${intervalMs}ms`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    interval,
    isEnabled,
    isRefreshing,
    lastRefresh,
    changeInterval,
    toggleRefresh,
    setIsRefreshing,
    updateLastRefresh,
    formatInterval,
    // Internal method exposed for setting up timer
    setupTimer
  };
}