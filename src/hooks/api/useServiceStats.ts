import { useCallback, useState } from 'react';
import { LocalStackApiService } from '../../services/localstack-api';
import type { ServiceStats } from '../../types';

export interface UseServiceStatsReturn {
  stats: ServiceStats;
  loading: boolean;
  error: string | null;
  loadStats: () => Promise<void>;
  setStats: (stats: ServiceStats) => void;
  setError: (error: string | null) => void;
}

const initialStats: ServiceStats = {
  dynamodb: { tables: [], totalTables: 0, totalItems: 0 },
  sqs: { queues: [], totalQueues: 0, totalVisibleMessages: 0, totalNotVisibleMessages: 0 },
  lambda: { functions: [], totalFunctions: 0, totalSize: 0 },
  logs: { logGroups: [], totalGroups: 0, totalStoredBytes: 0 },
  connected: false,
  lastUpdated: new Date()
};

/**
 * Custom hook for managing service statistics loading and state
 */
export function useServiceStats(): UseServiceStatsReturn {
  const [stats, setStats] = useState<ServiceStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const serviceStats = await LocalStackApiService.getServiceStats();
      setStats(serviceStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load service stats';
      setError(errorMessage);
      console.error('Error loading service stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    loadStats,
    setStats,
    setError
  };
}