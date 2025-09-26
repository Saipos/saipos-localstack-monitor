import { useGlobalRefresh } from '../../hooks/useGlobalRefresh';
import { ConnectionStatus } from './ConnectionStatus';

interface PageConnectionStatusProps {
  serviceName?: string;
  showOnConnected?: boolean;
}

export function PageConnectionStatus({
  serviceName = 'LocalStack',
  showOnConnected = false
}: PageConnectionStatusProps) {
  const { connectionStatus, lastError, lastRefresh, executeRefresh } = useGlobalRefresh();

  if (connectionStatus === 'connected' && !showOnConnected) {
    return null;
  }

  const getMessage = () => {
    if (lastError) return lastError;

    switch (connectionStatus) {
      case 'connected':
        return `${serviceName} está funcionando normalmente`;
      case 'checking':
        return `Verificando conectividade com ${serviceName}...`;
      case 'error':
        return `Alguns serviços do ${serviceName} estão com problemas`;
      case 'disconnected':
        return `Não foi possível conectar ao ${serviceName}`;
      default:
        return `Status do ${serviceName} desconhecido`;
    }
  };

  return (
    <div className="mb-6">
      <ConnectionStatus
        status={connectionStatus}
        message={getMessage()}
        lastChecked={lastRefresh}
        onRetry={executeRefresh}
      />
    </div>
  );
}