// Refactored BasicLocalStackDashboard using modular components and custom hooks
import { useCallback, useEffect } from 'react';
import { usePageRefresh } from '../../hooks/useGlobalRefresh';
import { useServiceStats, useServiceAvailability } from '../../hooks/api';
import {
  ServiceMetricsSection,
  DynamoDBSection,
  LambdaSection,
  LogsSection
} from './sections';

interface BasicLocalStackDashboardRefactoredProps {
  onTabChange?: (tab: string) => void;
}

export function BasicLocalStackDashboardRefactored({
  onTabChange
}: BasicLocalStackDashboardRefactoredProps) {
  // Use specialized hooks
  const { stats, loading, error, loadStats, setError } = useServiceStats();
  const { serviceAvailability, checkAvailability } = useServiceAvailability();

  // Combined refresh function for global refresh system
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([
        loadStats(),
        checkAvailability()
      ]);
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
      // Individual hooks handle their own errors
    }
  }, [loadStats, checkAvailability, setError]);

  // Register with global refresh system
  usePageRefresh('basic-dashboard', refreshData);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Loading state
  if (loading && stats.dynamodb.tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações dos serviços...</p>
        </div>
      </div>
    );
  }

  // Error state (only show if we have no data at all)
  if (error && stats.dynamodb.tables.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Erro ao Carregar Dashboard
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Service Metrics Overview */}
      <ServiceMetricsSection
        stats={stats}
        serviceAvailability={serviceAvailability}
        onTabChange={onTabChange}
      />

      {/* Error banner if there are issues but we have some data */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Aviso:</strong> {error}
          </p>
        </div>
      )}

      {/* DynamoDB Section */}
      <DynamoDBSection
        tables={stats.dynamodb.tables}
        isServiceAvailable={serviceAvailability.dynamodb}
      />

      {/* Lambda Section */}
      <LambdaSection
        functions={stats.lambda.functions}
        isServiceAvailable={serviceAvailability.lambda}
      />

      {/* Logs Section */}
      <LogsSection
        logGroups={stats.logs.logGroups}
        isServiceAvailable={serviceAvailability.logs}
      />

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        <p>
          Última atualização: {stats.lastUpdated.toLocaleString()}
        </p>
        {!stats.connected && (
          <p className="text-orange-600 mt-1">
            ⚠️ Alguns serviços podem estar indisponíveis
          </p>
        )}
      </div>
    </div>
  );
}