import { CheckCircle, Edit, Trash2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { SQSMessage, SQSMessageWithStatus } from '../../types/api/aws-api';

interface SQSTableProps {
  messages: SQSMessage[];
  queueName: string;
  onEditMessage?: (message: SQSMessage) => void;
  onDeleteMessage?: (message: SQSMessage) => void;
  maxReceiveCount?: number;
  synthetic?: boolean; // Criar uso de lógica visual para mensagens sintéticas
}

export function SQSTable({ messages, onEditMessage, onDeleteMessage, maxReceiveCount = 3 }: SQSTableProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  console.log('CurrentTime:', currentTime);
  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  // Process messages to add status and retry information
  const processedMessages = useMemo((): SQSMessageWithStatus[] => {
    return messages.map((message): SQSMessageWithStatus => {
      const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '0');
      const sentTimestamp = parseInt(message.Attributes?.SentTimestamp || '0');
      const now = Date.now();
      const ageInQueue = sentTimestamp ? now - sentTimestamp : 0;

      let status: 'normal' | 'dead-letter' = 'normal';
      let isProblematic = false;

      // Simple logic: DLQ if exceeded max receive count, otherwise normal
      if (message.Attributes?.FailureReason ||
          receiveCount >= maxReceiveCount ||
          message.MessageId?.startsWith('dlq-')) {
        status = 'dead-letter';
        isProblematic = true;
      } else {
        status = 'normal';
        isProblematic = false;
      }

      return {
        ...message,
        status,
        receiveCount,
        maxReceiveCount,
        isProblematic,
        ageInQueue,
        retryAttempts: receiveCount - 1
      };
    });
  }, [messages, maxReceiveCount]);

  const getStatusIcon = (status: SQSMessageWithStatus['status']) => {
    switch (status) {
      case 'dead-letter':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusBadge = (message: SQSMessageWithStatus) => {
    const colors = {
      'normal': 'bg-green-100 text-green-800',
      'dead-letter': 'bg-red-100 text-red-800',
      'warning': 'bg-yellow-100 text-yellow-800',
      'critical': 'bg-red-100 text-red-800'
    };

    const labels = {
      'normal': 'Disponível',
      'dead-letter': 'Dead Letter',
      'warning': 'Aviso',
      'critical': 'Crítico'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[message.status]}`}>
        {getStatusIcon(message.status)}
        <span className="ml-1">{labels[message.status]}</span>
      </span>
    );
  };

  const formatAge = (ageInMs: number) => {
    const seconds = Math.floor(ageInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const truncateBody = (body: string, maxLength: number = 100) => {
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + '...';
  };


  if (processedMessages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma mensagem encontrada na fila</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID da Mensagem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Corpo da Mensagem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tentativas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tempo na Fila
              </th>
              {(onDeleteMessage || onEditMessage) && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.1)] z-10 w-[120px] max-w-[120px] min-w-[120px]">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedMessages.map((message) => (
              <tr key={message.MessageId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(message)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-mono">
                    {message.MessageId.substring(0, 20)}...
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={message.Body}>
                      {truncateBody(message.Body)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      message.receiveCount > maxReceiveCount * 0.7
                        ? 'bg-red-100 text-red-800'
                        : message.receiveCount > 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {message.receiveCount}/{maxReceiveCount}
                    </span>
                    {message.retryAttempts > 0 && (
                      <span className="text-xs text-gray-500">
                        ({message.retryAttempts} reprocessamentos)
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{formatAge(message.ageInQueue)}</div>
                </td>
                {(onDeleteMessage || onEditMessage) && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.1)] z-10 w-[120px] max-w-[120px] min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      {onEditMessage && (
                        <button
                          onClick={() => onEditMessage(message)}
                          disabled={message.ReceiptHandle?.startsWith('synthetic-')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            message.ReceiptHandle?.startsWith('synthetic-')
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:bg-blue-50'
                          }`}
                          title={
                            message.ReceiptHandle?.startsWith('synthetic-')
                              ? 'Mensagem sintética - não pode ser editada'
                              : 'Editar mensagem'
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteMessage && (
                        <button
                          onClick={() => onDeleteMessage(message)}
                          disabled={message.ReceiptHandle?.startsWith('synthetic-')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            message.ReceiptHandle?.startsWith('synthetic-')
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={
                            message.ReceiptHandle?.startsWith('synthetic-')
                              ? 'Mensagem sintética - não pode ser deletada'
                              : 'Deletar mensagem'
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}