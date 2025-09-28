import { Clock, Copy, Eye, EyeOff, MessageSquare, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LocalStackApiService } from '../../services/localstack-api';
import type { SQSMessage, SQSMessagesViewerProps } from '../../types';
import { formatTimestamp } from '../../utils/formatters';

interface SQSMessagesViewerRequiredProps {
  queueUrl: string;
  queueName: string;
  messages: SQSMessage[];
  loading: boolean;
  error: string | null;
}

export function SQSMessagesViewer({
  queueUrl,
  queueName,
  messages: propMessages,
  loading: propLoading,
  error: propError
}: SQSMessagesViewerRequiredProps & Partial<SQSMessagesViewerProps>) {
  const [messages, setMessages] = useState<SQSMessage[]>(propMessages || []);
  const [loading, setLoading] = useState(propLoading || false);
  const [error, setError] = useState<string | null>(propError || null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await LocalStackApiService.getSQSMessages(queueUrl, 10);
      setMessages(msgs as SQSMessage[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (receiptHandle: string, messageId: string) => {
    try {
      await LocalStackApiService.deleteSQSMessage(queueUrl, receiptHandle);
      setMessages(prev => prev.filter(msg => msg.MessageId !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar mensagem');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await LocalStackApiService.sendSQSMessage(queueUrl, newMessage);
      setNewMessage('');
      // Reload messages to show the new one
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const isJsonString = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const formatMessageBody = (body: string, isExpanded: boolean) => {
    if (isJsonString(body)) {
      return isExpanded ? JSON.stringify(JSON.parse(body), null, 2) : body;
    }
    return body;
  };

  useEffect(() => {
    loadMessages();
  }, [queueUrl]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <span>Mensagens da Fila: {queueName}</span>
        </h3>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Send Message */}
      <div className="card p-4 bg-green-50 border border-green-200">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Send className="w-4 h-4 text-green-600" />
          <span>Enviar Nova Mensagem</span>
        </h4>
        <div className="space-y-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite o conteúdo da mensagem (texto ou JSON)..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {sendingMessage ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sendingMessage ? 'Enviando...' : 'Enviar Mensagem'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Messages List */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">
            Mensagens ({messages.length})
          </h4>
          {messages.length > 0 && (
            <div className="text-sm text-gray-500">
              Clique em uma mensagem para expandir
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando mensagens...</span>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message) => {
              const isExpanded = expandedMessages.has(message.MessageId);
              return (
                <div
                  key={message.MessageId}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Message Header */}
                  <div
                    onClick={() => toggleExpanded(message.MessageId)}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          ID: {message.MessageId.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          {typeof message.Attributes?.SentTimestamp === 'string' && (
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(message.Attributes.SentTimestamp)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(message.Body);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copiar conteúdo"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMessage(message.ReceiptHandle, message.MessageId);
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Deletar mensagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="space-y-4">
                        {/* Message Content */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Conteúdo da Mensagem:
                          </label>
                          <pre className="bg-gray-50 p-3 rounded-md text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">
                            {formatMessageBody(message.Body, true)}
                          </pre>
                        </div>

                        {/* Attributes */}
                        {Object.keys(message.Attributes || {}).length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Atributos:
                            </label>
                            <div className="bg-gray-50 p-3 rounded-md">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {Object.entries(message.Attributes || {}).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="font-medium text-gray-600">{key}:</span>
                                    <span className="text-gray-800">
                                      {key.includes('Timestamp') ? formatTimestamp(value as string) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message Attributes */}
                        {Object.keys(message.MessageAttributes || {}).length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Atributos Customizados:
                            </label>
                            <pre className="bg-gray-50 p-3 rounded-md text-sm text-gray-800 overflow-x-auto">
                              {JSON.stringify(message.MessageAttributes, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Receipt Handle */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Receipt Handle:
                          </label>
                          <div className="bg-gray-50 p-2 rounded-md text-xs font-mono text-gray-600 break-all">
                            {message.ReceiptHandle}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma mensagem na fila</p>
            <p className="text-sm mt-1">Envie uma mensagem usando o formulário acima</p>
          </div>
        )}
      </div>
    </div>
  );
}