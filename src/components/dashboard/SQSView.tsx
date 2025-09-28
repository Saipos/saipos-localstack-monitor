import { AlertCircle, Eye, Info, MessageSquare, Plus, RefreshCw, Send, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDebounceCallback } from '../../hooks/useDebounce';
import { usePageRefresh } from '../../hooks/useGlobalRefresh';
import { LocalStackApiService } from '../../services/localstack-api';
import type { SQSMessage } from '../../types/api/aws-api';
import { DeleteConfirmation } from '../shared/DeleteConfirmation';
import { MessageCreator } from '../shared/MessageCreator';
import { MessageEditor } from '../shared/MessageEditor';
import { MetricCard } from '../shared/MetricCard';
import { QueueInfoPanel } from '../shared/QueueInfoPanel';
import { SQSTable } from '../shared/SQSTable';

interface QueueInfo {
  url: string;
  name: string;
  visibleMessages: number;
  notVisibleMessages: number;
  attributes: Record<string, unknown>;
}

export function SQSView() {
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVisible, setTotalVisible] = useState(0);
  const [totalNotVisible, setTotalNotVisible] = useState(0);
  const [selectedQueue, setSelectedQueue] = useState<QueueInfo | null>(null);
  const [messages, setMessages] = useState<SQSMessage[]>([]);
  const [queueDetails, setQueueDetails] = useState<{
    queueName: string;
    queueUrl: string;
    isFifoQueue: boolean;
    maxReceiveCount: number;
    attributes: Record<string, string>;
  } | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessageCreator, setShowMessageCreator] = useState(false);
  const [showMessageEditor, setShowMessageEditor] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showQueueInfo, setShowQueueInfo] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<SQSMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<SQSMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'available' | 'dlq'>('available');



  const loadQueuesInternal = useCallback(async () => {
    try {
      setError(null);
      const stats = await LocalStackApiService.getSQSStats();
      setQueues(stats.queues);
      setTotalVisible(stats.totalVisibleMessages);
      setTotalNotVisible(stats.totalNotVisibleMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar filas SQS');
      console.error('Erro ao carregar filas:', err);
      setQueues([]);
      setTotalVisible(0);
      setTotalNotVisible(0);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced version to prevent excessive API calls
  const loadQueues = useDebounceCallback(loadQueuesInternal, 500);

  // Registra esta página no sistema global de refresh
  usePageRefresh('sqs-view', loadQueues);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  const loadQueueDataInternal = useCallback(async (queue: QueueInfo, mode: 'available' | 'dlq' = viewMode) => {
    try {
      setSelectedQueue(queue);
      setLoadingMessages(true);
      setError(null);

      // Load both queue messages and queue details in parallel
      const [messagesData, details] = await Promise.all([
        LocalStackApiService.getSQSMessagesFiltered(queue.url, mode),
        LocalStackApiService.getQueueDetails(queue.name)
      ]);

      setMessages((messagesData.Messages || []) as SQSMessage[]);
      setQueueDetails({
        ...details,
        queueName: queue.name,
        queueUrl: queue.url
      });
    } catch (error) {
      console.error(`Falha ao carregar dados da fila ${queue.name} (modo ${mode}):`, error);
      setError(error instanceof Error ? error.message : 'Falha ao carregar fila');
      setMessages([]);
      setQueueDetails(null);
    } finally {
      setLoadingMessages(false);
    }
  }, [viewMode]);

  //@ts-expect-error error
  const loadQueueData = useDebounceCallback(loadQueueDataInternal, 300);

  const refreshQueueDataInternal = useCallback(async () => {
    if (selectedQueue) {
      await loadQueueDataInternal(selectedQueue);
    }
  }, [selectedQueue, loadQueueDataInternal]);

  // Debounced version to prevent excessive refresh API calls
  const refreshQueueData = useDebounceCallback(refreshQueueDataInternal, 500);

  // Handle view mode change
  const handleViewModeChange = useCallback(async (newMode: 'available' | 'dlq') => {
    setViewMode(newMode);
    if (selectedQueue) {
      await loadQueueDataInternal(selectedQueue, newMode);
    }
  }, [selectedQueue, loadQueueDataInternal]);


  const handleCreateMessage = async (messageData: {
    body: string;
    attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
    delaySeconds?: number;
    messageGroupId?: string;
    messageDeduplicationId?: string;
  }) => {
    if (!selectedQueue) return;

    try {
      await LocalStackApiService.createSQSMessage(selectedQueue.name, messageData);
      setShowMessageCreator(false);
      // Refresh queue data to show the new message
      await refreshQueueData();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Falha ao criar mensagem');
    }
  };

  const handleEditClick = (message: SQSMessage) => {
    setMessageToEdit(message);
    setShowMessageEditor(true);
  };

  const handleDeleteClick = (message: SQSMessage) => {
    setMessageToDelete(message);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQueue || !messageToDelete) return;

    try {
      setIsDeleting(true);
      const result = await LocalStackApiService.deleteSQSMessage(selectedQueue.url, messageToDelete.ReceiptHandle);

      setShowDeleteConfirmation(false);
      setMessageToDelete(null);

      // Show different feedback for synthetic vs real messages
      if (result.synthetic) {
        console.log('Synthetic message delete simulated');
        // For synthetic messages, just refresh to show updated state
        setTimeout(() => refreshQueueData(), 500);
      } else {
        // For real messages, refresh immediately
        await refreshQueueData();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      setError(error instanceof Error ? error.message : 'Falha ao deletar mensagem');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setMessageToDelete(null);
  };

  const handleUpdateMessage = async (messageData: {
    body: string;
    attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
  }) => {
    if (!selectedQueue || !messageToEdit) return;

    try {
      await LocalStackApiService.updateSQSMessage(selectedQueue.name, messageToEdit.ReceiptHandle, messageData, messageToEdit);
      setShowMessageEditor(false);
      setMessageToEdit(null);
      // Refresh queue data to show the updated message
      await refreshQueueData();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Falha ao atualizar mensagem');
    }
  };

  const handleEditCancel = () => {
    setShowMessageEditor(false);
    setMessageToEdit(null);
  };

  const resetQueueView = useCallback(() => {
    setSelectedQueue(null);
    setMessages([]);
    setQueueDetails(null);
    setShowMessageCreator(false);
    setShowMessageEditor(false);
    setShowDeleteConfirmation(false);
    setShowQueueInfo(false);
    setMessageToEdit(null);
    setMessageToDelete(null);
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
          {selectedQueue && (
            <span className="text-sm text-gray-500">→ {selectedQueue.name}</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {selectedQueue && (
            <button
              onClick={resetQueueView}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Voltar para lista de filas"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="text-sm text-gray-600 font-medium">
            Total de Filas: {queues.length}
          </div>
        </div>
      </div>

      {!selectedQueue ? (
        // Queues Overview
        <>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filas Disponíveis</h3>
            {queues.length > 0 ? (
              <div className="space-y-3">
                {queues.map((queue, index) => (
                  <div
                    key={index}
                    onClick={() => loadQueueData(queue)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-green-50 hover:border-green-200 border border-transparent transition-all cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 group-hover:text-green-900">{queue.name}</div>
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
                      <Eye className="w-4 h-4 text-green-600 group-hover:text-green-700" />
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
                  Clique em uma fila para ver suas mensagens, enviar novas mensagens ou gerenciar o conteúdo.
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
        </>
      ) : (
        // Queue Messages View
        <div className="space-y-6">
          {/* Queue Header with Actions */}
          <div className="card p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedQueue.name}</h3>
                    <p className="text-sm text-gray-600">
                      {messages.length} mensagens {loadingMessages && '(carregando...)'}
                    </p>
                    {queueDetails?.isFifoQueue && (
                      <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Fila FIFO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls Section - Responsive Layout */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Filter Section */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">Filtro:</span>
                  <div className="relative">
                    <select
                      value={viewMode}
                      onChange={(e) => handleViewModeChange(e.target.value as 'available' | 'dlq')}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      title="Selecionar modo de visualização"
                    >
                      <option value="available">Mensagens Visíveis</option>
                      <option value="dlq">Dead Letter Queue</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons - Responsive Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 lg:gap-3">
                  {queueDetails && (
                    <button
                      onClick={() => setShowQueueInfo(true)}
                      className="flex items-center justify-center lg:justify-start space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      title="Ver detalhes da fila"
                    >
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden md:inline lg:inline">Detalhes</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowMessageCreator(true)}
                    className="flex items-center justify-center lg:justify-start space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
                    title="Criar nova mensagem"
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden md:inline lg:inline">Nova Mensagem</span>
                  </button>


                  <button
                    onClick={refreshQueueData}
                    disabled={loadingMessages}
                    className="flex items-center justify-center lg:justify-start space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm"
                    title="Atualizar mensagens"
                  >
                    <RefreshCw className={`w-4 h-4 flex-shrink-0 ${loadingMessages ? 'animate-spin' : ''}`} />
                    <span className="hidden md:inline lg:inline">Atualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {queueDetails && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg mt-5">
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{selectedQueue.visibleMessages.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Mensagens Visíveis</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-purple-600">{selectedQueue.notVisibleMessages.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Em Processamento</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">{queueDetails.maxReceiveCount}</div>
                  <div className="text-xs text-gray-600">Max Recebimentos</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-blue-600">{queueDetails.isFifoQueue ? 'FIFO' : 'Standard'}</div>
                  <div className="text-xs text-gray-600">Tipo da Fila</div>
                </div>
              </div>
            )}
          </div>


          {/* Messages Table */}
          <div className="card p-6">
            {error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
                <p className="text-red-800 mb-2">Erro ao carregar mensagens da fila</p>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={refreshQueueData}
                  className="mt-4 btn-primary text-sm"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : loadingMessages ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Carregando mensagens da fila...</p>
              </div>
            ) : messages.length > 0 ? (
              <SQSTable
                messages={messages}
                queueName={selectedQueue.name}
                onEditMessage={handleEditClick}
                onDeleteMessage={handleDeleteClick}
                maxReceiveCount={queueDetails?.maxReceiveCount || 3}
                synthetic={false}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="mb-2">Nenhuma mensagem encontrada na fila</p>
                <p className="text-sm mb-4">A fila está vazia ou não contém mensagens</p>
                <button
                  onClick={() => setShowMessageCreator(true)}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Primeira Mensagem</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Creator */}
      {showMessageCreator && queueDetails && (
        <MessageCreator
          queueName={selectedQueue!.name}
          isFifoQueue={queueDetails.isFifoQueue}
          onMessageCreated={handleCreateMessage}
          onCancel={() => setShowMessageCreator(false)}
        />
      )}

      {/* Message Editor */}
      {showMessageEditor && messageToEdit && (
        <MessageEditor
          queueName={selectedQueue!.name}
          message={messageToEdit}
          onMessageUpdated={handleUpdateMessage}
          onCancel={handleEditCancel}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirmation && messageToDelete && (
        <DeleteConfirmation
          isOpen={showDeleteConfirmation}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          itemDescription={`Mensagem ID: ${messageToDelete.MessageId}\nCorpo: ${messageToDelete.Body.substring(0, 100)}${messageToDelete.Body.length > 100 ? '...' : ''}`}
          loading={isDeleting}
        />
      )}

      {/* Queue Info Panel */}
      {showQueueInfo && queueDetails && (
        <QueueInfoPanel
          queueDetails={queueDetails}
          onClose={() => setShowQueueInfo(false)}
        />
      )}

    </div>
  );
}