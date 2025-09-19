import { useState, useEffect } from 'react';
import { Database, MessageSquare, Zap, FileText, AlertCircle, RefreshCw, Eye, Activity } from 'lucide-react';
import { MetricCard } from '../shared/MetricCard';
import { StatusBadge } from '../shared/StatusBadge';
import { LocalStackApiService } from '../../services/localstack-api';

interface ServiceStats {
  dynamodb: {
    tables: any[];
    totalTables: number;
    totalItems: number;
  };
  sqs: {
    queues: any[];
    totalQueues: number;
    totalVisibleMessages: number;
    totalNotVisibleMessages: number;
  };
  lambda: {
    functions: any[];
    totalFunctions: number;
    totalSize: number;
  };
  logs: {
    logGroups: any[];
    totalGroups: number;
    totalStoredBytes: number;
  };
  connected: boolean;
  lastUpdated: Date;
}

interface BasicLocalStackDashboardProps {
  onTabChange?: (tab: string) => void;
}

export function BasicLocalStackDashboard({ onTabChange }: BasicLocalStackDashboardProps) {
  const [stats, setStats] = useState<ServiceStats>({
    dynamodb: { tables: [], totalTables: 0, totalItems: 0 },
    sqs: { queues: [], totalQueues: 0, totalVisibleMessages: 0, totalNotVisibleMessages: 0 },
    lambda: { functions: [], totalFunctions: 0, totalSize: 0 },
    logs: { logGroups: [], totalGroups: 0, totalStoredBytes: 0 },
    connected: false,
    lastUpdated: new Date()
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedLogGroup, setSelectedLogGroup] = useState<string | null>(null);
  const [logEvents, setLogEvents] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setError(null);
      const serviceStats = await LocalStackApiService.getServiceStats();
      setStats(serviceStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LocalStack stats');
      console.error('Basic dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    try {
      setSelectedTable(tableName);
      const data = await LocalStackApiService.scanTable(tableName, 10);
      setTableData(data);
    } catch (error) {
      console.error(`Failed to load table data for ${tableName}:`, error);
      setTableData([]);
    }
  };

  const loadLogEvents = async (logGroupName: string) => {
    try {
      setSelectedLogGroup(logGroupName);
      const events = await LocalStackApiService.getLogEvents(logGroupName, 20);
      setLogEvents(events);
    } catch (error) {
      console.error(`Failed to load log events for ${logGroupName}:`, error);
      setLogEvents([]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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
            onClick={loadStats}
            className="mt-2 btn-primary text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LocalStack Monitor</h1>
          <p className="text-gray-600">Monitoramento genérico dos serviços AWS</p>
        </div>
        <div className="flex items-center space-x-4">
          <StatusBadge status={stats.connected ? 'success' : 'error'}>
            {stats.connected ? 'Conectado' : 'Desconectado'}
          </StatusBadge>
          <button
            onClick={loadStats}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Service Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="DynamoDB Tables"
          value={stats.dynamodb.totalTables}
          subtitle={`${stats.dynamodb.totalItems} items total`}
          icon={Database}
          color="blue"
          onClick={() => onTabChange?.('tokens')}
        />

        <MetricCard
          title="SQS Queues"
          value={stats.sqs.totalQueues}
          subtitle={`${stats.sqs.totalVisibleMessages} mensagens visíveis`}
          icon={MessageSquare}
          color="green"
          onClick={() => onTabChange?.('queue')}
        />

        <MetricCard
          title="Lambda Functions"
          value={stats.lambda.totalFunctions}
          subtitle={formatBytes(stats.lambda.totalSize)}
          icon={Zap}
          color="purple"
          onClick={() => onTabChange?.('logs')}
        />

        <MetricCard
          title="Log Groups"
          value={stats.logs.totalGroups}
          subtitle={formatBytes(stats.logs.totalStoredBytes)}
          icon={FileText}
          color="yellow"
          onClick={() => onTabChange?.('logs')}
        />
      </div>

      {/* SQS Queue Details */}
      {stats.sqs.queues.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SQS Queues</h3>
          <div className="space-y-3">
            {stats.sqs.queues.map((queue, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">{queue.name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {queue.url}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-green-600">{queue.visibleMessages}</div>
                    <div className="text-gray-500">Visíveis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-600">{queue.notVisibleMessages}</div>
                    <div className="text-gray-500">Processando</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DynamoDB Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">DynamoDB Tables</h3>
          {stats.dynamodb.tables.length > 0 ? (
            <div className="space-y-2">
              {stats.dynamodb.tables.map((table, index) => (
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tableData.map((item, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                    <pre className="text-gray-700 overflow-x-auto">
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

      {/* Lambda Functions and Log Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lambda Functions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lambda Functions</h3>
          {stats.lambda.functions.length > 0 ? (
            <div className="space-y-2">
              {stats.lambda.functions.map((func, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-medium text-gray-900">{func.functionName}</div>
                      <div className="text-sm text-gray-500">
                        {func.runtime} • {formatBytes(func.codeSize)} • {func.state}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhuma função encontrada
            </div>
          )}
        </div>

        {/* Log Groups */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CloudWatch Log Groups</h3>
          {stats.logs.logGroups.length > 0 ? (
            <div className="space-y-2">
              {stats.logs.logGroups.map((group, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{group.logGroupName}</div>
                      <div className="text-sm text-gray-500">
                        {formatBytes(group.storedBytes)} • {group.metricFilterCount} filters
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => loadLogEvents(group.logGroupName)}
                    className="text-orange-600 hover:text-orange-800 p-1"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhum log group encontrado
            </div>
          )}
        </div>
      </div>

      {/* Log Events Viewer */}
      {selectedLogGroup && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Log Events: {selectedLogGroup}
          </h3>
          {logEvents.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logEvents.map((event, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="text-gray-500 mb-1">
                    {formatTimestamp(event.timestamp)}
                  </div>
                  <div className="text-gray-700 font-mono">
                    {event.message}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhum log encontrado
            </div>
          )}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${stats.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{stats.connected ? 'Conectado ao LocalStack' : 'Desconectado'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-3 h-3 text-blue-500" />
            <span>Atualização automática a cada 10 segundos</span>
          </div>
          <div className="text-xs text-gray-400">
            Última atualização: {stats.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}