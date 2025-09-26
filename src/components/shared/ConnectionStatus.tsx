import { AlertTriangle, CheckCircle, Loader, XCircle } from 'lucide-react';
import type { ConnectionState } from '../../types';

interface ConnectionStatusProps {
  status: ConnectionState;
  message?: string;
  lastChecked?: Date;
  onRetry?: () => void;
}

export function ConnectionStatus({
  status,
  message,
  lastChecked,
  onRetry
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'LocalStack Conectado',
          description: message || 'Todos os serviços estão funcionando normalmente'
        };
      case 'checking':
        return {
          icon: Loader,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Verificando Conexão',
          description: 'Testando conectividade com LocalStack...'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          title: 'Problemas de Conectividade',
          description: message || 'Alguns serviços podem estar indisponíveis'
        };
      case 'disconnected':
      default:
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'LocalStack Desconectado',
          description: message || 'Não foi possível conectar ao LocalStack'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.color} ${status === 'checking' ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${config.color}`}>
              {config.title}
            </h3>
            {lastChecked && (
              <span className="text-xs text-gray-500">
                {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {config.description}
          </p>

          {status === 'disconnected' && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-500">
                <p><strong>Possíveis causas:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>LocalStack não está rodando no Docker</li>
                  <li>Porta 4566 não está acessível</li>
                  <li>Problemas de configuração de rede</li>
                </ul>
              </div>

              <div className="text-xs text-gray-500">
                <p><strong>Como resolver:</strong></p>
                <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                  docker run --rm -it -p 4566:4566 localstack/localstack
                </code>
              </div>

              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  Tentar Novamente
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}