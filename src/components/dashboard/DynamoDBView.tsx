import { useState, useEffect } from 'react';
import { Database, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import { LocalStackApiService } from '../../services/localstack-api';

interface DynamoTable {
  name: string;
  itemCount: number;
  sizeBytes: number;
  creationDateTime?: string;
}

export function DynamoDBView() {
  const [tables, setTables] = useState<DynamoTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 10000);
    return () => clearInterval(interval);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={loadTables}
            className="mt-2 btn-primary text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">DynamoDB Tables</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 font-medium">
            Total de Tabelas: {tables.length}
          </div>
          <button
            onClick={loadTables}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables List */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tabelas Disponíveis</h3>
          {tables.length > 0 ? (
            <div className="space-y-2">
              {tables.map((table, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Database className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">{table.name}</div>
                      <div className="text-sm text-gray-500">
                        {table.itemCount} items • {formatBytes(table.sizeBytes)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => loadTableData(table.name)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhuma tabela encontrada
            </div>
          )}
        </div>

        {/* Table Data Viewer */}
        {selectedTable && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Dados da Tabela: {selectedTable}
            </h3>
            {tableData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tableData.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded text-xs">
                    <pre className="text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Nenhum item encontrado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}