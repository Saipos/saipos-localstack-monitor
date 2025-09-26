import { useState, useCallback } from 'react';
import type { ConnectionState } from '../../types';
import { ERROR_MESSAGES } from '../../constants';

export interface UseConnectionStatusReturn {
  connectionStatus: ConnectionState;
  lastError: string | null;
  setConnectionStatus: (status: ConnectionState) => void;
  setLastError: (error: string | null) => void;
  updateConnectionState: (
    successCount: number,
    totalAttempts: number,
    failures: PromiseRejectedResult[]
  ) => void;
}

/**
 * Custom hook for managing connection status and error messages
 */
export function useConnectionStatus(
  initialStatus: ConnectionState = 'disconnected'
): UseConnectionStatusReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>(initialStatus);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Update connection state based on service call results
   */
  const updateConnectionState = useCallback((
    successCount: number,
    totalAttempts: number,
    failures: PromiseRejectedResult[]
  ) => {
    if (successCount === 0) {
      // All services failed - LocalStack completely offline
      setConnectionStatus('disconnected');
      const firstError = failures[0]?.reason;

      if (firstError?.message?.includes('500') ||
          firstError?.message?.includes('Failed to load resource') ||
          firstError?.message?.includes('Failed to list')) {
        setLastError(ERROR_MESSAGES.LOCALSTACK_NOT_RESPONDING);
      } else if (firstError?.message?.includes('fetch')) {
        setLastError(ERROR_MESSAGES.FAILED_TO_CONNECT);
      } else {
        setLastError(ERROR_MESSAGES.SERVICES_UNAVAILABLE);
      }
    } else if (successCount === totalAttempts) {
      // All services succeeded
      setConnectionStatus('connected');
      setLastError(null);
    } else {
      // Some services failed - partial connectivity
      setConnectionStatus('connected');
      setLastError(`${successCount} de ${totalAttempts} serviços disponíveis`);
    }
  }, []);

  return {
    connectionStatus,
    lastError,
    setConnectionStatus,
    setLastError,
    updateConnectionState
  };
}