import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, AlertCircle, Send } from 'lucide-react';
import { LocalStackApiService } from '../../services/localstack-api';
import { MetricCard } from '../shared/MetricCard';

interface QueueInfo {
  url: string;
  name: string;
  visibleMessages: number;
  notVisibleMessages: number;
  attributes: Record<string, any>;
}

export function SQSView() {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVisible, setTotalVisible] = useState(0);
  const [totalNotVisible, setTotalNotVisible] = useState(0);

  useEffect(() => {
    loadQueues();
    const interval = setInterval(loadQueues, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadQueues = async () => {
    try {
      setError(null);
      const stats = await LocalStackApiService.getSQSStats();
      setQueues(stats.queues);
      setTotalVisible(stats.totalVisibleMessages);
      setTotalNotVisible(stats.totalNotVisibleMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar filas SQS');
      console.error('Erro ao carregar filas:', err);
    } finally {
      setLoading(false);
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
            onClick={loadQueues}
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
          <MessageSquare className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">SQS Queues</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 font-medium">
            Total de Filas: {queues.length}
          </div>
          <button
            onClick={loadQueues}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total de Filas"
          value={queues.length}
          subtitle="Filas disponíveis"
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard
          title="Mensagens Visíveis"
          value={totalVisible}
          subtitle="Prontas para processamento"
          icon={Send}
          color="green"
        />
        <MetricCard
          title="Mensagens em Processamento"
          value={totalNotVisible}
          subtitle="Sendo processadas"
          icon={RefreshCw}
          color="purple"
        />
      </div>

      {/* Queues List */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes das Filas</h3>
        {queues.length > 0 ? (
          <div className="space-y-3">
            {queues.map((queue, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{queue.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {queue.url}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-green-600 text-lg">{queue.visibleMessages}</div>
                    <div className="text-gray-500">Visíveis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600 text-lg">{queue.notVisibleMessages}</div>
                    <div className="text-gray-500">Processando</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600 text-lg">{queue.visibleMessages + queue.notVisibleMessages}</div>
                    <div className="text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">Nenhuma fila encontrada</p>
            <p className="text-sm">Crie uma fila no LocalStack para vê-la aqui</p>
          </div>
        )}
      </div>

      {/* Queue Actions */}
      <div className="card p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ações da Fila</h3>
            <p className="text-gray-600 text-sm">
              Use a AWS CLI ou SDK para criar e gerenciar filas SQS no LocalStack.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadQueues}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar Dados</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}