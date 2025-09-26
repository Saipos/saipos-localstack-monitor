import { Database, Eye, X } from 'lucide-react';
import { useState } from 'react';
import { LocalStackApiService } from '../../../services/localstack-api';
import type { TableInfo } from '../../../types';
import { formatBytes, formatDateOnly } from '../../../utils/formatters';

interface DynamoDBSectionProps {
  tables: TableInfo[];
  isServiceAvailable: boolean;
}

export function DynamoDBSection({ tables, isServiceAvailable }: DynamoDBSectionProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const handleTableClick = async (tableName: string) => {
    if (selectedTable === tableName) {
      setSelectedTable(null);
      setTableData([]);
      return;
    }

    setSelectedTable(tableName);
    setLoadingData(true);

    try {
      const data = await LocalStackApiService.scanTable(tableName, 10);
      setTableData(data);
    } catch (error) {
      console.error(`Failed to load data for table ${tableName}:`, error);
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  if (!isServiceAvailable) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 text-red-700">
          <Database className="w-5 h-5" />
          <h3 className="font-semibold">DynamoDB Indisponível</h3>
        </div>
        <p className="text-red-600 text-sm mt-1">
          O serviço DynamoDB não está disponível no momento.
        </p>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma Tabela Encontrada
          </h3>
          <p className="text-gray-600">
            Não há tabelas DynamoDB disponíveis no LocalStack.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Tabelas DynamoDB</h3>
        <span className="text-sm text-gray-500">({tables.length} tabelas)</span>
      </div>

      <div className="grid gap-4">
        {tables.map((table) => (
          <div key={table.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-800">{table.name}</h4>
                  <span className="text-sm text-gray-500">
                    {table.itemCount} items • {formatBytes(table.sizeBytes)}
                  </span>
                  {table.creationDateTime && (
                    <span className="text-xs text-gray-400">
                      Criada: {formatDateOnly(table.creationDateTime)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleTableClick(table.name)}
                className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">
                  {selectedTable === table.name ? 'Ocultar' : 'Ver Dados'}
                </span>
              </button>
            </div>

            {selectedTable === table.name && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-700">
                    Dados da Tabela (10 primeiros)
                  </h5>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loadingData ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : tableData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(tableData[0]).slice(0, 5).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-gray-700 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.slice(0, 5).map((item, index) => (
                          <tr key={index} className="border-t">
                            {Object.keys(item).slice(0, 5).map((key) => (
                              <td key={key} className="px-3 py-2 text-gray-600">
                                {JSON.stringify(item[key]).slice(0, 50)}
                                {JSON.stringify(item[key]).length > 50 && '...'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Nenhum dado encontrado na tabela.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}