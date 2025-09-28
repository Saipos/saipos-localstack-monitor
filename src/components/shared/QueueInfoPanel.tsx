import { X, MessageSquare, Clock, Settings, Shield, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatBytes } from '../../utils/formatters';

interface QueueInfoPanelProps {
  queueDetails: {
    queueName: string;
    queueUrl: string;
    isFifoQueue: boolean;
    maxReceiveCount: number;
    attributes: Record<string, string>;
  };
  onClose: () => void;
}

export function QueueInfoPanel({ queueDetails, onClose }: QueueInfoPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    configuration: false,
    fifo: false,
    security: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatAttribute = (key: string, value: string) => {
    switch (key) {
      case 'CreatedTimestamp':
      case 'LastModifiedTimestamp':
        return formatDate(new Date(parseInt(value) * 1000));
      case 'MaximumMessageSize':
        return formatBytes(parseInt(value));
      case 'MessageRetentionPeriod':
      case 'VisibilityTimeout':
      case 'DelaySeconds':
      case 'ReceiveMessageWaitTimeSeconds':
        return `${value} segundos`;
      case 'SqsManagedSseEnabled':
      case 'ContentBasedDeduplication':
      case 'FifoQueue':
        return value === 'true' ? 'Habilitado' : 'Desabilitado';
      default:
        return value;
    }
  };

  const getQueueType = () => {
    return queueDetails.isFifoQueue ? 'FIFO' : 'Standard';
  };

  const getQueueTypeColor = () => {
    return queueDetails.isFifoQueue ? 'text-purple-600' : 'text-blue-600';
  };

  const getQueueTypeBg = () => {
    return queueDetails.isFifoQueue ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200';
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Detalhes da Fila</h2>
              <p className="text-sm text-gray-600">{queueDetails.queueName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Overview Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('overview')}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Visão Geral</span>
              </div>
              {expandedSections.overview ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.overview && (
              <div className="mt-3 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nome da Fila</label>
                    <p className="text-sm text-gray-900 font-mono">{queueDetails.queueName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tipo da Fila</label>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getQueueTypeBg()}`}>
                      <span className={getQueueTypeColor()}>{getQueueType()}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">URL da Fila</label>
                    <p className="text-sm text-gray-900 font-mono break-all">{queueDetails.queueUrl}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">ARN da Fila</label>
                    <p className="text-sm text-gray-900 font-mono break-all">
                      {queueDetails.attributes.QueueArn || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mensagens Visíveis</label>
                    <p className="text-sm text-gray-900">
                      {queueDetails.attributes.ApproximateNumberOfMessages || '0'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mensagens em Processamento</label>
                    <p className="text-sm text-gray-900">
                      {queueDetails.attributes.ApproximateNumberOfMessagesNotVisible || '0'}
                    </p>
                  </div>
                  {queueDetails.attributes.CreatedTimestamp && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Data de Criação</label>
                      <p className="text-sm text-gray-900">
                        {formatAttribute('CreatedTimestamp', queueDetails.attributes.CreatedTimestamp)}
                      </p>
                    </div>
                  )}
                  {queueDetails.attributes.LastModifiedTimestamp && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Última Modificação</label>
                      <p className="text-sm text-gray-900">
                        {formatAttribute('LastModifiedTimestamp', queueDetails.attributes.LastModifiedTimestamp)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Configuration Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('configuration')}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Configuração</span>
              </div>
              {expandedSections.configuration ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.configuration && (
              <div className="mt-3 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tamanho Máximo da Mensagem</label>
                    <p className="text-sm text-gray-900">
                      {formatAttribute('MaximumMessageSize', queueDetails.attributes.MaximumMessageSize || '262144')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Período de Retenção</label>
                    <p className="text-sm text-gray-900">
                      {formatAttribute('MessageRetentionPeriod', queueDetails.attributes.MessageRetentionPeriod || '1209600')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Timeout de Visibilidade</label>
                    <p className="text-sm text-gray-900">
                      {formatAttribute('VisibilityTimeout', queueDetails.attributes.VisibilityTimeout || '30')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Delay de Entrega</label>
                    <p className="text-sm text-gray-900">
                      {formatAttribute('DelaySeconds', queueDetails.attributes.DelaySeconds || '0')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tempo de Espera</label>
                    <p className="text-sm text-gray-900">
                      {formatAttribute('ReceiveMessageWaitTimeSeconds', queueDetails.attributes.ReceiveMessageWaitTimeSeconds || '0')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Max Recebimentos</label>
                    <p className="text-sm text-gray-900">{queueDetails.maxReceiveCount}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FIFO Configuration (if applicable) */}
          {queueDetails.isFifoQueue && (
            <div className="mb-6">
              <button
                onClick={() => toggleSection('fifo')}
                className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Configuração FIFO</span>
                </div>
                {expandedSections.fifo ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {expandedSections.fifo && (
                <div className="mt-3 p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Deduplicação Baseada em Conteúdo</label>
                      <p className="text-sm text-gray-900">
                        {formatAttribute('ContentBasedDeduplication', queueDetails.attributes.ContentBasedDeduplication || 'false')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Escopo de Deduplicação</label>
                      <p className="text-sm text-gray-900 capitalize">
                        {queueDetails.attributes.DeduplicationScope || 'queue'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Limite de Throughput FIFO</label>
                      <p className="text-sm text-gray-900 capitalize">
                        {queueDetails.attributes.FifoThroughputLimit || 'perQueue'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('security')}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Segurança</span>
              </div>
              {expandedSections.security ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.security && (
              <div className="mt-3 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Criptografia SQS</label>
                    <p className="text-sm text-gray-900">
                      {formatAttribute('SqsManagedSseEnabled', queueDetails.attributes.SqsManagedSseEnabled || 'false')}
                    </p>
                  </div>
                  {queueDetails.attributes.KmsMasterKeyId && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Chave KMS</label>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {queueDetails.attributes.KmsMasterKeyId}
                      </p>
                    </div>
                  )}
                  {queueDetails.attributes.KmsDataKeyReusePeriodSeconds && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Período de Reuso da Chave</label>
                      <p className="text-sm text-gray-900">
                        {queueDetails.attributes.KmsDataKeyReusePeriodSeconds} segundos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}