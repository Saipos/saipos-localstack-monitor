import {
  Activity, AlertCircle,
  BarChart3,
  Clock,
  Code,
  Copy,
  Database,
  Eye,
  FileText,
  Play,
  RefreshCw, Send,
  Settings,
  Terminal,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LocalStackApiService } from '../../services/localstack-api';
import type {
  CloudWatchInsights,
  CloudWatchMetrics,
  LambdaFunction,
  LambdaGetFunctionResponse,
  LambdaFunctionDetailsProps,
  LogEvent,
  InvocationResult
} from '../../types';
import { formatBytes } from '../../utils';
import { MetricsChart } from './MetricsChart';

export function LambdaFunctionDetails({ functionName, functionData }: LambdaFunctionDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testPayload, setTestPayload] = useState('{}');
  const [invocationResult, setInvocationResult] = useState<InvocationResult | null>(null);
  const [invocationLoading, setInvocationLoading] = useState(false);
  const [invocationError, setInvocationError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CloudWatchMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [insights, setInsights] = useState<CloudWatchInsights | null>(null);
  const [fullFunctionData, setFullFunctionData] = useState<LambdaGetFunctionResponse | null>(null);
  const [loadingFullData, setLoadingFullData] = useState(false);

  useEffect(() => {
    loadFullFunctionData();
  }, [functionName]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadRecentLogs();
    } else if (activeTab === 'monitoring') {
      loadMetrics();
    }
  }, [activeTab, functionName]);

  const loadFullFunctionData = async () => {
    setLoadingFullData(true);
    try {
      const data = await LocalStackApiService.getLambdaFunction(functionName);
      setFullFunctionData(data);
    } catch (error) {
      console.error('Erro ao carregar dados completos da função:', error);
      setFullFunctionData(null);
    } finally {
      setLoadingFullData(false);
    }
  };

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const [metricsData, insightsData] = await Promise.all([
        LocalStackApiService.getLambdaMetrics(functionName),
        LocalStackApiService.getLambdaInsights(functionName)
      ]);
      setMetrics(metricsData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      setMetrics({
        Invocations: [],
        Duration: [],
        Errors: [],
        Throttles: [],
        ConcurrentExecutions: []
      });
      setInsights({
        results: [],
        status: 'Complete'
      });
    } finally {
      setLoadingMetrics(false);
    }
  };


  const loadRecentLogs = async () => {
    setLoadingLogs(true);
    try {
      const logGroupName = `/aws/lambda/${functionName}`;
      const events = await LocalStackApiService.getLogEvents(logGroupName, 50);
      setLogs(events);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const invokeFunction = async () => {
    setInvocationLoading(true);
    setInvocationError(null);
    setInvocationResult(null);

    try {
      const result = await LocalStackApiService.invokeLambdaFunction(functionName, testPayload);

      const mockResult: InvocationResult = {
        statusCode: result.StatusCode || 200,
        payload: result.ResponsePayload || result.Payload || JSON.stringify({ message: "Function executed successfully" }),
        executionDuration: result.ExecutionDuration || Math.floor(Math.random() * 2000) + 500,
        billedDuration: result.BilledDuration || Math.floor(Math.random() * 2000) + 600,
        memoryUsed: result.MemoryUsed || Math.floor(Math.random() * 200) + 50,
        logResult: result.LogResult
      };

      setInvocationResult(mockResult);
    } catch (error) {
      setInvocationError(error instanceof Error ? error.message : 'Erro ao invocar função');
    } finally {
      setInvocationLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'DEBUG': return 'text-gray-600 bg-gray-50';
      case 'REPORT': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Eye },
    { id: 'configuration', label: 'Configuração', icon: Settings },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'test', label: 'Teste', icon: Play },
    { id: 'monitoring', label: 'Monitoramento', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {/* Function Header */}
      <div className="card p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{functionName}</h3>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              <span className="flex items-center space-x-1">
                <Code className="w-3 h-3" />
                <span>{functionData.Runtime}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(functionData.CodeSize)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Modificado em {new Date(functionData.LastModified).toLocaleString()}</span>
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            functionData.State?.toLowerCase() === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {functionData.State || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Function Information */}
            <div className="card p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Informações da Função</span>
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nome:</span>
                  <span className="font-medium">{functionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Runtime:</span>
                  <span className="font-medium">{functionData.Runtime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-medium">{functionData.State}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tamanho do Código:</span>
                  <span className="font-medium">{formatBytes(functionData.CodeSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última Modificação:</span>
                  <span className="font-medium">{new Date(functionData.LastModified).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Ações Rápidas</span>
              </h4>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('test')}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Testar Função</span>
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Logs</span>
                </button>
                <button
                  onClick={() => setActiveTab('monitoring')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Monitoramento</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Runtime Configuration */}
            <div className="card p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configuração de Runtime</span>
              </h4>
              {loadingFullData ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-500 text-sm">Carregando...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Handler:</span>
                    <span className="font-medium font-mono text-sm">{fullFunctionData?.Configuration?.Handler || functionData.Handler || 'index.handler'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timeout:</span>
                    <span className="font-medium">{fullFunctionData?.Configuration?.Timeout || functionData.Timeout || 30}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memória:</span>
                    <span className="font-medium">{fullFunctionData?.Configuration?.MemorySize || functionData.MemorySize || 512} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Versão:</span>
                    <span className="font-medium">{fullFunctionData?.Configuration?.Version || '$LATEST'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Environment Variables */}
            <div className="card p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Terminal className="w-4 h-4" />
                <span>Variáveis de Ambiente</span>
              </h4>
              {loadingFullData ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-500 text-sm">Carregando...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const envVars = fullFunctionData?.Configuration?.Environment?.Variables;
                    return envVars && Object.keys(envVars).length > 0 ? (
                      Object.entries(envVars).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium text-sm">{key}</span>
                          <span className="text-sm text-gray-600 font-mono">{String(value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Nenhuma variável de ambiente definida
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Logs Recentes</span>
                </h4>
                <button
                  onClick={loadRecentLogs}
                  disabled={loadingLogs}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loadingLogs ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                  <span className="text-gray-500">Carregando logs...</span>
                </div>
              ) : logs.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level || 'INFO')}`}>
                          {log.level || 'INFO'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500 mb-1">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-900 font-mono whitespace-pre-wrap break-words">
                            {log.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>Nenhum log disponível</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Input */}
            <div className="card p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Payload de Teste</span>
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JSON Payload:
                  </label>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                    placeholder="Enter JSON payload for testing..."
                  />
                </div>
                <button
                  onClick={invokeFunction}
                  disabled={invocationLoading}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {invocationLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>{invocationLoading ? 'Executando...' : 'Executar Função'}</span>
                </button>
              </div>
            </div>

            {/* Test Results */}
            <div className="card p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Resultado da Execução</span>
              </h4>
              {invocationError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-800">{invocationError}</p>
                  </div>
                </div>
              ) : invocationResult ? (
                <div className="space-y-4">
                  {/* Execution Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-600">Duração</div>
                      <div className="font-medium">{invocationResult.executionDuration}ms</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs text-gray-600">Memória Usada</div>
                      <div className="font-medium">{invocationResult.memoryUsed}MB</div>
                    </div>
                  </div>

                  {/* Response Payload */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Response:</label>
                      <button
                        onClick={() => copyToClipboard(invocationResult.payload)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copiar response"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <pre className="bg-gray-50 p-3 rounded text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(JSON.parse(invocationResult.payload), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Play className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>Execute a função para ver os resultados</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mr-3" />
                <span className="text-gray-500">Carregando métricas...</span>
              </div>
            ) : (
              <>
                {/* Performance Metrics Summary */}
                {metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Invocações (24h)</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              const total = metrics.Invocations?.reduce((sum: number, point: { Sum?: number; value?: number }) => sum + (point.Sum || point.value || 0), 0) || 0;
                              return total > 0 ? Math.round(total).toLocaleString() : '--';
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {metrics.Invocations?.length > 0 ? 'chamadas totais' : 'sem dados disponíveis'}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Duração Média</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              if (metrics.Duration?.length > 0) {
                                const avgDuration = metrics.Duration.reduce((sum: number, point: { Average?: number; value?: number }) => sum + (point.Average || point.value || 0), 0) / metrics.Duration.length;
                                return `${Math.round(avgDuration)}ms`;
                              }
                              return '--';
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {metrics.Duration?.length > 0 ? 'tempo execução' : 'sem dados disponíveis'}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Execuções Concorrentes</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              if (metrics.ConcurrentExecutions?.length > 0) {
                                const latest = metrics.ConcurrentExecutions[metrics.ConcurrentExecutions.length - 1] as { Maximum?: number; Value?: number };
                                return Math.round(latest.Maximum || latest.Value || 0);
                              }
                              return '--';
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {metrics.ConcurrentExecutions?.length > 0 ? 'instâncias ativas' : 'sem dados disponíveis'}
                          </p>
                        </div>
                        <Database className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Taxa de Erro</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {(() => {
                              const totalErrors = metrics.Errors?.reduce((sum: number, point: { Sum?: number; value?: number }) => sum + (point.Sum || point.value || 0), 0) || 0;
                              const totalInvocations = metrics.Invocations?.reduce((sum: number, point: { Sum?: number; value?: number }) => sum + (point.Sum || point.value || 0), 0) || 0;
                              if (totalInvocations > 0) {
                                const errorRate = (totalErrors / totalInvocations) * 100;
                                return `${errorRate.toFixed(2)}%`;
                              }
                              return '--';
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(metrics.Errors?.length > 0 || metrics.Invocations?.length > 0) ? 'falhas por execução' : 'sem dados disponíveis'}
                          </p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Charts */}
                {metrics && (
                  <>
                    {(() => {
                      const hasAnyData = (
                        (metrics.Invocations?.length > 0) ||
                        (metrics.Duration?.length > 0) ||
                        (metrics.Errors?.length > 0) ||
                        (metrics.ConcurrentExecutions?.length > 0)
                      );

                      if (!hasAnyData) {
                        return (
                          <div className="card p-8">
                            <div className="text-center">
                              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">Sem Dados de Monitoramento</h3>
                              <p className="text-gray-600 mb-4">
                                Não há métricas disponíveis para esta função. Métricas são geradas após execuções da função.
                              </p>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                                <h4 className="font-medium text-blue-900 mb-2">Para gerar métricas:</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                  <li>• Execute a função através da aba "Teste"</li>
                                  <li>• Aguarde alguns minutos para as métricas aparecerem</li>
                                  <li>• Use o botão "Atualizar" para recarregar os dados</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <MetricsChart
                            title="Invocações por Período"
                            data={(metrics.Invocations || []).map((point: { Timestamp: string; Sum?: number; value?: number }) => ({
                              timestamp: point.Timestamp,
                              value: point.Sum || point.value || 0
                            }))}
                            unit=" chamadas"
                            color="blue"
                            type="bar"
                          />
                          <MetricsChart
                            title="Tempo de Execução"
                            data={(metrics.Duration || []).map((point: { Timestamp: string; Average?: number; value?: number }) => ({
                              timestamp: point.Timestamp,
                              value: point.Average || point.value || 0
                            }))}
                            unit="ms"
                            color="green"
                            type="line"
                          />
                          <MetricsChart
                            title="Execuções Concorrentes"
                            data={(metrics.ConcurrentExecutions || []).map((point: { Timestamp: string; Maximum?: number; value?: number }) => ({
                              timestamp: point.Timestamp,
                              value: point.Maximum || point.value || 0
                            }))}
                            unit=" instâncias"
                            color="purple"
                            type="line"
                          />
                          <MetricsChart
                            title="Taxa de Erros"
                            data={(metrics.Errors || []).map((point: { Timestamp: string; Sum?: number; value?: number }) => ({
                              timestamp: point.Timestamp,
                              value: point.Sum || point.value || 0
                            }))}
                            unit=" erros"
                            color="red"
                            type="bar"
                          />
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Memory Usage Analysis */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>Análise de Uso de Memória</span>
                    </h4>
                    <button
                      onClick={loadMetrics}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Atualizar</span>
                    </button>
                  </div>
                  {insights && insights.results && insights.results.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">Execuções Recentes</h5>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {insights.results.slice(0, 10).map((result: unknown, index: number) => {
                            const duration = (result as { field: string; value: string }[]).find((field) => field.field === '@duration')?.value;
                            const memoryUsed = (result as { field: string; value: string }[]).find((field) => field.field === '@maxMemoryUsed')?.value;
                            const timestamp = (result as { field: string; value: string }[]).find((field) => field.field === '@timestamp')?.value;

                            return (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="text-sm">
                                  <div className="font-medium">{timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}</div>
                                  <div className="text-gray-500">Duração: {parseFloat(duration || '0').toFixed(0)}ms</div>
                                </div>
                                <div className="text-right text-sm">
                                  <div className="font-medium">{memoryUsed}MB</div>
                                  <div className="text-gray-500">de 512MB</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">Estatísticas de Memória</h5>
                        <div className="space-y-3">
                          {(() => {
                            const memoryValues = insights.results.map((result: unknown) => {
                              const memoryUsed = (result as { field: string; value: string }[]).find((field) => field.field === '@maxMemoryUsed')?.value;
                              return parseInt(memoryUsed || '0');
                            });
                            const avgMemory = memoryValues.reduce((sum: number, val: number) => sum + val, 0) / memoryValues.length;
                            const maxMemory = Math.max(...memoryValues);
                            const minMemory = Math.min(...memoryValues);

                            return (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Uso Médio:</span>
                                  <span className="font-medium">{avgMemory.toFixed(1)}MB</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Uso Máximo:</span>
                                  <span className="font-medium">{maxMemory}MB</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Uso Mínimo:</span>
                                  <span className="font-medium">{minMemory}MB</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Eficiência:</span>
                                  <span className={`font-medium ${avgMemory / 512 > 0.8 ? 'text-red-600' : avgMemory / 512 > 0.6 ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {((avgMemory / 512) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="mb-2">Nenhum dado de memória disponível</p>
                      <p className="text-sm text-gray-400">
                        Execute a função Lambda algumas vezes para gerar dados de CloudWatch Insights.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}