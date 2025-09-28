import { AlertCircle, Database, Eye, Info, Plus, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDebounceCallback } from '../../hooks/useDebounce';
import { usePageRefresh } from '../../hooks/useGlobalRefresh';
import { LocalStackApiService } from '../../services/localstack-api';
import type { DynamoDBRawItem, DynamoDBTableDescription, DynamoTable } from '../../types';
import { formatBytes, formatDateOnly } from '../../utils/formatters';
import { DeleteConfirmation } from '../shared/DeleteConfirmation';
import { DynamoDBTable } from '../shared/DynamoDBTable';
import { ItemCreator } from '../shared/ItemCreator';
import { ItemEditor } from '../shared/ItemEditor';
import { TableInfoPanel } from '../shared/TableInfoPanel';

export function DynamoDBView() {
  const [tables, setTables] = useState<DynamoTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<DynamoDBRawItem[]>([]);
  const [tableDetails, setTableDetails] = useState<DynamoDBTableDescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTableInfo, setShowTableInfo] = useState(false);
  const [showItemCreator, setShowItemCreator] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DynamoDBRawItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<DynamoDBRawItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const loadTablesInternal = useCallback(async () => {
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

  // Debounced version to prevent excessive API calls
  const loadTables = useDebounceCallback(loadTablesInternal, 500);

  usePageRefresh('dynamodb-view', loadTables);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const loadTableDataInternal = useCallback(async (tableName: string) => {
    try {
      setSelectedTable(tableName);
      setLoadingData(true);
      setError(null);

      // Load both table data and table details in parallel
      const [data, details] = await Promise.all([
        LocalStackApiService.scanTable(tableName, 10),
        LocalStackApiService.getTableDetails(tableName)
      ]);

      setTableData(data as DynamoDBRawItem[]);
      setTableDetails(details);
    } catch (error) {
      console.error(`Falha ao carregar dados da tabela ${tableName}:`, error);
      setError(error instanceof Error ? error.message : 'Falha ao carregar tabela');
      setTableData([]);
      setTableDetails(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  //@ts-expect-error error
  const loadTableData = useDebounceCallback(loadTableDataInternal, 300);

  const refreshTableDataInternal = useCallback(async () => {
    if (selectedTable) {
      await loadTableDataInternal(selectedTable);
    }
  }, [selectedTable, loadTableDataInternal]);

  // Debounced version to prevent excessive refresh API calls
  const refreshTableData = useDebounceCallback(refreshTableDataInternal, 500);

  const handleCreateItem = async (item: DynamoDBRawItem) => {
    if (!selectedTable) return;

    try {
      await LocalStackApiService.createTableItem(selectedTable, item);
      setShowItemCreator(false);
      // Refresh table data to show the new item
      await refreshTableData();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Falha ao criar item');
    }
  };

  const handleDeleteClick = (item: DynamoDBRawItem) => {
    setItemToDelete(item);
    setShowDeleteConfirmation(true);
  };

  const handleEditClick = (item: DynamoDBRawItem) => {
    setItemToEdit(item);
    setShowItemEditor(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTable || !itemToDelete || !tableDetails) return;

    try {
      setIsDeleting(true);

      // Extract the key from the item based on the table's key schema
      const key: Record<string, unknown> = {};
      tableDetails.Table.KeySchema.forEach(keyDef => {
        if (itemToDelete[keyDef.AttributeName]) {
          key[keyDef.AttributeName] = itemToDelete[keyDef.AttributeName];
        }
      });

      await LocalStackApiService.deleteTableItem(selectedTable, key);
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
      // Refresh table data to remove the deleted item
      await refreshTableData();
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(error instanceof Error ? error.message : 'Falha ao deletar item');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };

  const handleUpdateItem = async (item: DynamoDBRawItem) => {
    if (!selectedTable) return;

    try {
      await LocalStackApiService.updateTableItem(selectedTable, item);
      setShowItemEditor(false);
      setItemToEdit(null);
      // Refresh table data to show the updated item
      await refreshTableData();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Falha ao atualizar item');
    }
  };

  const handleEditCancel = () => {
    setShowItemEditor(false);
    setItemToEdit(null);
  };

  const resetTableView = useCallback(() => {
    setSelectedTable(null);
    setTableData([]);
    setTableDetails(null);
    setShowTableInfo(false);
    setShowItemCreator(false);
    setShowItemEditor(false);
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
    setItemToEdit(null);
    setError(null);
  }, []);


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
        <div className="space-y-6">
          {/* Table Header with Actions */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Database className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedTable}</h3>
                  <p className="text-sm text-gray-600">
                    {tableData.length} itens {loadingData && '(carregando...)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {tableDetails && (
                  <button
                    onClick={() => setShowTableInfo(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Ver detalhes da tabela"
                  >
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">Detalhes</span>
                  </button>
                )}

                <button
                  onClick={() => setShowItemCreator(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  title="Criar novo item"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Item</span>
                </button>

                <button
                  onClick={refreshTableData}
                  disabled={loadingData}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  title="Atualizar dados"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>

                <button
                  onClick={resetTableView}
                  className="text-gray-500 hover:text-gray-700 p-2"
                  title="Voltar para lista de tabelas"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            {tableDetails && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="font-bold text-lg text-blue-600">{tableDetails.Table.ItemCount.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Total de Itens</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900">{formatBytes(tableDetails.Table.TableSizeBytes)}</div>
                  <div className="text-xs text-gray-600">Tamanho da Tabela</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{tableDetails.Table.KeySchema.length}</div>
                  <div className="text-xs text-gray-600">Chaves Primárias</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-purple-600">
                    {(tableDetails.Table.GlobalSecondaryIndexes?.length || 0) + (tableDetails.Table.LocalSecondaryIndexes?.length || 0)}
                  </div>
                  <div className="text-xs text-gray-600">Índices</div>
                </div>
              </div>
            )}
          </div>

          {/* Table Data */}
          <div className="card p-6">
            {error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
                <p className="text-red-800 mb-2">Erro ao carregar dados da tabela</p>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={refreshTableData}
                  className="mt-4 btn-primary text-sm"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : loadingData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Carregando dados da tabela...</p>
              </div>
            ) : tableData.length > 0 ? (
              <DynamoDBTable
                data={tableData}
                tableName={selectedTable}
                onDeleteItem={handleDeleteClick}
                onEditItem={handleEditClick}
                keySchema={tableDetails?.Table.KeySchema}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="mb-2">Nenhum item encontrado na tabela</p>
                <p className="text-sm mb-4">A tabela está vazia ou não contém dados</p>
                <button
                  onClick={() => setShowItemCreator(true)}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Primeiro Item</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table Info Panel */}
      {showTableInfo && tableDetails && (
        <TableInfoPanel
          tableDetails={tableDetails}
          onClose={() => setShowTableInfo(false)}
        />
      )}

      {/* Item Creator */}
      {showItemCreator && tableDetails && (
        <ItemCreator
          tableName={selectedTable!}
          tableSchema={{
            keySchema: tableDetails.Table.KeySchema,
            attributeDefinitions: tableDetails.Table.AttributeDefinitions
          }}
          onItemCreated={handleCreateItem}
          onCancel={() => setShowItemCreator(false)}
        />
      )}

      {/* Item Editor */}
      {showItemEditor && itemToEdit && (
        <ItemEditor
          tableName={selectedTable!}
          item={itemToEdit}
          onItemUpdated={handleUpdateItem}
          onCancel={handleEditCancel}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirmation && itemToDelete && (
        <DeleteConfirmation
          isOpen={showDeleteConfirmation}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          itemDescription={JSON.stringify(itemToDelete, null, 2)}
          loading={isDeleting}
        />
      )}
    </div>
  );
}