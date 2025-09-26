import { useState, useEffect, useCallback } from 'react';
import { Zap, RefreshCw, AlertCircle, X, Code, Clock, Database, Activity, Eye, Terminal } from 'lucide-react';
import { LocalStackApiService } from '../../services/localstack-api';
import { MetricCard } from '../shared/MetricCard';
import { usePageRefresh } from '../../hooks/useGlobalRefresh';
import { LambdaFunctionDetails } from '../shared/LambdaFunctionDetails';
import type { LambdaFunction } from '../../types';
import { formatBytes, formatDateOnly } from '../../utils/formatters';

interface LambdaFunctionDisplay {
  functionName: string;
  runtime: string;
  lastModified: string;
  state: string;
  codeSize: number;
  description?: string;
  timeout?: number;
  memorySize?: number;
  handler?: string;
  role?: string;
  environment?: Record<string, string>;
}

export function LambdaView() {
  const [functions, setFunctions] = useState<LambdaFunctionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [selectedFunction, setSelectedFunction] = useState<LambdaFunctionDisplay | null>(null);

  const loadFunctions = useCallback(async () => {
    try {
      setError(null);
      const stats = await LocalStackApiService.getLambdaStats();
      const displayFunctions = stats.functions.map(func => ({
        functionName: func.FunctionName,
        runtime: func.Runtime,
        lastModified: func.LastModified,
        state: func.State || 'Unknown',
        codeSize: func.CodeSize,
        description: func.Description,
        timeout: func.Timeout,
        memorySize: func.MemorySize,
        handler: func.Handler,
        role: func.Role,
        environment: func.Environment?.Variables
      }));
      setFunctions(displayFunctions);
      setTotalSize(stats.totalSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar funções Lambda');
      console.error('Erro ao carregar funções:', err);
      setFunctions([]);
      setTotalSize(0);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  usePageRefresh('lambda-view', loadFunctions);

  useEffect(() => {
    loadFunctions();
  }, []);


  const getStateColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getRuntimeColor = (runtime: string) => {
    if (runtime?.includes('python')) return 'bg-blue-100 text-blue-800';
    if (runtime?.includes('node')) return 'bg-green-100 text-green-800';
    if (runtime?.includes('java')) return 'bg-orange-100 text-orange-800';
    if (runtime?.includes('dotnet')) return 'bg-purple-100 text-purple-800';
    if (runtime?.includes('go')) return 'bg-cyan-100 text-cyan-800';
    return 'bg-gray-100 text-gray-800';
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
            onClick={loadFunctions}
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
          <Zap className="w-6 h-6 text-yellow-600" />
          <h2 className="text-xl font-bold text-gray-900">Lambda Functions</h2>
          {selectedFunction && (
            <span className="text-sm text-gray-500">→ {selectedFunction.functionName}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {selectedFunction && (
            <button
              onClick={() => setSelectedFunction(null)}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Voltar para lista de funções"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="text-sm text-gray-600 font-medium">
            Total de Funções: {functions.length}
          </div>
        </div>
      </div>

      {!selectedFunction ? (
        <>
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total de Funções"
              value={functions.length}
              subtitle="Funções disponíveis"
              icon={Zap}
              color="yellow"
            />
            <MetricCard
              title="Tamanho Total do Código"
              value={formatBytes(totalSize)}
              subtitle="Espaço utilizado"
              icon={Code}
              color="blue"
            />
            <MetricCard
              title="Funções Ativas"
              value={functions.filter(f => f.state?.toLowerCase() === 'active').length}
              subtitle="Prontas para execução"
              icon={Activity}
              color="green"
            />
          </div>

          {/* Functions List */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Funções Disponíveis</h3>
            {functions.length > 0 ? (
              <div className="space-y-3">
                {functions.map((func, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedFunction(func)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-yellow-50 hover:border-yellow-200 border border-transparent transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <Zap className="w-5 h-5 text-yellow-600 group-hover:text-yellow-700 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 group-hover:text-yellow-900 truncate">
                          {func.functionName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-4 mt-1">
                          <span className="flex items-center space-x-1">
                            <Code className="w-3 h-3" />
                            <span>{func.runtime}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateOnly(func.lastModified)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Database className="w-3 h-3" />
                            <span>{formatBytes(func.codeSize)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRuntimeColor(func.runtime)}`}>
                        {func.runtime}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStateColor(func.state)}`}>
                        {func.state || 'Unknown'}
                      </span>
                      <Eye className="w-4 h-4 text-yellow-600 group-hover:text-yellow-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhuma função encontrada</p>
                <p className="text-sm">Implante funções Lambda no LocalStack para vê-las aqui</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ações das Funções</h3>
                <p className="text-gray-600 text-sm">
                  Clique em uma função para ver detalhes, logs, métricas de execução e testar invocações.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={loadFunctions}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Atualizar Dados</span>
                </button>
              </div>
            </div>
          </div>

          {/* Development Tips */}
          <div className="card p-6 border-l-4 border-yellow-500">
            <div className="flex items-start space-x-3">
              <Terminal className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Dicas para Desenvolvedores</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Use os logs em tempo real para debug de funções Lambda</p>
                  <p>• Monitore o tempo de execução e uso de memória</p>
                  <p>• Teste suas funções com payloads customizados</p>
                  <p>• Verifique as variáveis de ambiente e configurações</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Function Details View
        <LambdaFunctionDetails
          functionName={selectedFunction.functionName}
          functionData={{
            FunctionName: selectedFunction.functionName,
            Runtime: selectedFunction.runtime,
            LastModified: selectedFunction.lastModified,
            State: selectedFunction.state,
            CodeSize: selectedFunction.codeSize,
            Description: selectedFunction.description || '',
            Timeout: selectedFunction.timeout || 30,
            MemorySize: selectedFunction.memorySize || 512,
            Handler: selectedFunction.handler || 'index.handler',
            Role: selectedFunction.role || '',
            FunctionArn: '',
            CodeSha256: '',
            Version: '$LATEST',
            Environment: {
              Variables: selectedFunction.environment || {}
            },
            TracingConfig: {
              Mode: 'PassThrough'
            },
            RevisionId: ''
          } as LambdaFunction}
        />
      )}
    </div>
  );
}