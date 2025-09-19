import { useState, useEffect } from 'react';
import { Database, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import { LocalStackApiService } from '../../services/localstack-api';

interface DynamoTable {
  name: string;
  itemCount: number;
  sizeBytes: number;
  creationDateTime?: string;
}

export function StoreTokensView() {
  const [tables, setTables] = useState<DynamoTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setError(null);
      const stats = await LocalStackApiService.getDynamoDBStats();
      setTables(stats.tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar tabelas DynamoDB');
      console.error('Erro ao carregar tabelas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    try {
      setSelectedTable(tableName);
      const data = await LocalStackApiService.scanTable(tableName, 20);
      setTableData(data);
    } catch (error) {
      console.error(`Falha ao carregar dados da tabela ${tableName}:`, error);
      setTableData([]);
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'meta': return 'bg-saipos-blue-500 text-white';
      case 'google': return 'bg-accent-500 text-white';
      case 'tiktok': return 'bg-purple-500 text-white';
      default: return 'bg-saipos-gray-500 text-white';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'meta': return '🔵';
      case 'google': return '🟢';
      case 'tiktok': return '🟣';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Store className="w-6 h-6 text-saipos-blue-600" />
          <h2 className="text-xl font-bold text-saipos-gray-900">Store Tokens Overview</h2>
        </div>
        <div className="text-sm text-saipos-gray-600 font-medium">
          Total Stores: {storeData.length} | Total Tokens: {storeData.reduce((sum, store) => sum + store.totalTokens, 0)}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Database className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Stores Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {storeData.map((store) => (
          <div key={store.storeId} className="card p-6 border-l-4 border-l-saipos-blue-500">
            {/* Store Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-saipos-gray-900">
                Store {store.storeId}
              </h3>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  store.activeTokens === store.totalTokens
                    ? 'bg-green-100 text-green-800'
                    : store.activeTokens > 0
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {store.activeTokens}/{store.totalTokens} Active
                </span>
              </div>
            </div>

            {/* Tokens List */}
            <div className="space-y-3">
              {store.tokens.map((token) => (
                <div
                  key={token.idPlatformToken}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getPlatformIcon(token.platform)}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPlatformColor(token.platform)}`}>
                          {token.platform.toUpperCase()}
                        </span>
                        {token.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Pixel ID: <code className="bg-gray-200 px-1 rounded">{token.pixelId}</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Store Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-saipos-blue-600">{store.activeTokens}</div>
                  <div className="text-saipos-gray-600 font-medium">Active</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-saipos-gray-900">{store.totalTokens}</div>
                  <div className="text-saipos-gray-600 font-medium">Total</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Test Actions</h3>
            <p className="text-gray-600 text-sm">
              Test the system with events for different stores to verify token routing.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadStoreTokens}
              className="btn-secondary flex items-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>Refresh Tokens</span>
            </button>
            <button
              onClick={() => {
                window.open('https://github.com/anthropics/claude-code', '_blank');
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Test Events</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}