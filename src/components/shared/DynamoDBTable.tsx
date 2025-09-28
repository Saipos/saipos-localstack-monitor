import { ChevronDown, ChevronUp, Database, Download, Edit, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DynamoDBItem, DynamoDBRawItem, DynamoDBTableProps } from '../../types';

export function DynamoDBTable({ data, tableName, onDeleteItem, onEditItem }: DynamoDBTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Converte dados do formato DynamoDB para formato simples
  const convertDynamoDBData = (items: DynamoDBRawItem[]) => {
    return items.map(item => {
      const converted: DynamoDBItem = {};
      Object.keys(item).forEach(key => {
        const value = item[key];
        // Converte tipos DynamoDB para valores simples
        if (typeof value === 'object' && value !== null) {
          if (value.S !== undefined) converted[key] = value.S; // String
          else if (value.N !== undefined) converted[key] = Number(value.N); // Number
          else if (value.B !== undefined) converted[key] = value.B; // Binary
          else if (value.SS !== undefined) converted[key] = value.SS.join(', '); // String Set
          else if (value.NS !== undefined) converted[key] = value.NS.join(', '); // Number Set
          else if (value.BS !== undefined) converted[key] = value.BS.join(', '); // Binary Set
          else if (value.M !== undefined) converted[key] = JSON.stringify(value.M); // Map
          else if (value.L !== undefined) converted[key] = JSON.stringify(value.L); // List
          else if (value.NULL !== undefined) converted[key] = null; // Null
          else if (value.BOOL !== undefined) converted[key] = value.BOOL; // Boolean
          else converted[key] = JSON.stringify(value); // Fallback
        } else {
          converted[key] = value;
        }
      });
      return converted;
    });
  };

  // Dados convertidos
  const convertedData = useMemo(() => convertDynamoDBData(data), [data]);

  // Extrai todas as colunas únicas
  const columns = useMemo(() => {
    const allKeys = new Set<string>();
    convertedData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    return Array.from(allKeys).sort();
  }, [convertedData]);


  const handleDeleteClick = (item: DynamoDBRawItem) => {
    if (onDeleteItem) {
      onDeleteItem(item);
    }
  };

  const handleEditClick = (item: DynamoDBRawItem) => {
    if (onEditItem) {
      onEditItem(item);
    }
  };

  // Filtro por busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return convertedData;
    return convertedData.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [convertedData, searchTerm]);

  // Ordenação
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return sortDirection === 'asc' ? 1 : -1;

      // Compare values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginação
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const csvHeaders = columns.join(',');
    const csvData = sortedData.map(row =>
      columns.map(col => {
        const value = row[col];
        // Escape quotes and wrap in quotes if contains comma
        const strValue = String(value || '');
        return strValue.includes(',') ? `"${strValue.replace(/"/g, '""')}"` : strValue;
      }).join(',')
    ).join('\n');

    const csvContent = `${csvHeaders}\n${csvData}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}-data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatValue = (value: string | number | boolean | null | DynamoDBItem | DynamoDBItem[]) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum dados encontrados na tabela</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar em todos os campos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <span className="text-sm text-gray-500">
            {sortedData.length} de {convertedData.length} registros
          </span>
        </div>

        <button
          onClick={exportToCSV}
          className="btn-primary text-sm flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Tabels */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(column => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column}</span>
                      {sortColumn === column && (
                        sortDirection === 'asc' ?
                          <ChevronUp className="w-4 h-4" /> :
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                ))}
                {(onDeleteItem || onEditItem) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.1)] z-10 w-[120px] max-w-[120px] min-w-[120px]">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, index) => {
                const originalItem = data[sortedData.indexOf(row)];
                return (
                  <tr key={index} className="hover:bg-gray-50 group">
                    {columns.map(column => (
                      <td
                        key={column}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        title={String(row[column] || '')}
                      >
                        {formatValue(row[column])}
                      </td>
                    ))}
                    {(onDeleteItem || onEditItem) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.1)] z-10 w-[120px] max-w-[120px] min-w-[120px]">
                        <div className="flex items-center space-x-2">
                          {onEditItem && (
                            <button
                              onClick={() => handleEditClick(originalItem)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                              title="Editar item"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteItem && (
                            <button
                              onClick={() => handleDeleteClick(originalItem)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Deletar item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedData.length)} de {sortedData.length} resultados
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}