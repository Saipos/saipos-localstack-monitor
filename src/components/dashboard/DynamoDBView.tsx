import { AlertCircle, Database, Eye, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { usePageRefresh } from '../../hooks/useGlobalRefresh';
import { LocalStackApiService } from '../../services/localstack-api';
import { formatBytes, formatDateOnly } from '../../utils/formatters';
import { DynamoDBTable } from '../shared/DynamoDBTable';
import type { DynamoDBRawItem, DynamoTable } from '../../types';

export function DynamoDBView() {
  const [tables, setTables] = useState<DynamoTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<DynamoDBRawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    try {
      setError(null);
      const stats = await LocalStackApiService.getDynamoDBStats();
      setTables(stats.tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar tabelas DynamoDB');
      console.error('Erro ao carregar tabelas:', err);
      setTables([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh('dynamodb-view', loadTables);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const loadTableData = async (tableName: string) => {
    try {
      setSelectedTable(tableName);
      const data = await LocalStackApiService.scanTable(tableName, 20);
      setTableData(data as DynamoDBRawItem[]);
    } catch (error) {
      console.error(`Falha ao carregar dados da tabela ${tableName}:`, error);
      setTableData([]);
    }
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
        <div className="text-sm text-gray-600 font-medium">
          Total de Tabelas: {tables.length}
        </div>
      </div>

      {!selectedTable ? (
        // Tables List View
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tabelas Disponíveis</h3>
          {tables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table, index) => (
                <div
                  key={index}
                  onClick={() => loadTableData(table.name)}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-blue-900">{table.name}</div>
                        <div className="text-sm text-gray-500">
                          {table.itemCount} items • {formatBytes(table.sizeBytes)}
                        </div>
                        {table.creationDateTime && (
                          <div className="text-xs text-gray-400 mt-1">
                            Criada: {formatDateOnly(table.creationDateTime)}
                          </div>
                        )}
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma tabela encontrada</p>
              <p className="text-sm mt-1">Crie tabelas DynamoDB para visualizá-las aqui</p>
            </div>
          )}
        </div>
      ) : (
        // Table Data View
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>Dados da Tabela: {selectedTable}</span>
            </h3>
            <button
              onClick={() => {
                setSelectedTable(null);
                setTableData([]);
              }}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Voltar para lista de tabelas"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {tableData.length > 0 ? (
            <DynamoDBTable data={tableData} tableName={selectedTable} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum item encontrado na tabela</p>
              <p className="text-sm mt-1">A tabela está vazia ou não contém dados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}