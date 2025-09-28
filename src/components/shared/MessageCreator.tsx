import {
  Plus,
  X,
  Save,
  AlertCircle,
  Info,
  Trash2,
  Code
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { JsonTextarea } from './JsonTextarea';

interface MessageAttribute {
  name: string;
  value: string;
  type: 'String' | 'Number' | 'Binary';
}

interface MessageCreatorProps {
  queueName: string;
  isFifoQueue?: boolean;
  onMessageCreated: (messageData: {
    body: string;
    attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
    delaySeconds?: number;
    messageGroupId?: string;
    messageDeduplicationId?: string;
  }) => void;
  onCancel: () => void;
}

export function MessageCreator({ queueName, isFifoQueue = false, onMessageCreated, onCancel }: MessageCreatorProps) {
  const [messageBody, setMessageBody] = useState('');
  const [attributes, setAttributes] = useState<MessageAttribute[]>([]);
  const [delaySeconds, setDelaySeconds] = useState<number | undefined>(isFifoQueue ? undefined : 10);
  const [messageGroupId, setMessageGroupId] = useState('');
  const [messageDeduplicationId, setMessageDeduplicationId] = useState('');
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAttribute = useCallback(() => {
    setAttributes(prev => [...prev, { name: '', value: '', type: 'String' }]);
  }, []);

  const updateAttribute = useCallback((index: number, updates: Partial<MessageAttribute>) => {
    setAttributes(prev => prev.map((attr, i) => i === index ? { ...attr, ...updates } : attr));
    // Clear attribute-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`attribute-${index}`];
      return newErrors;
    });
  }, []);

  const removeAttribute = useCallback((index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // JSON mode validation
    if (jsonMode) {
      if (!jsonValue.trim()) {
        newErrors.general = 'JSON da mensagem é obrigatório';
        setErrors(newErrors);
        return false;
      }

      try {
        const parsed = JSON.parse(jsonValue);
        if (!parsed || typeof parsed !== 'object') {
          newErrors.general = 'JSON deve ser um objeto válido';
        }
        if (!parsed.body || typeof parsed.body !== 'string') {
          newErrors.general = 'Campo "body" é obrigatório e deve ser uma string';
        }
      } catch {
        newErrors.general = 'JSON inválido. Verifique a sintaxe.';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Form mode validation
    if (!messageBody.trim()) {
      newErrors.general = 'Corpo da mensagem é obrigatório';
    }

    // FIFO queue validations
    if (isFifoQueue) {
      if (!messageGroupId.trim()) {
        newErrors.messageGroupId = 'Message Group ID é obrigatório para filas FIFO';
      }
      // messageDeduplicationId is optional if content-based deduplication is enabled
    }

    // Delay seconds validation
    if (delaySeconds !== undefined && (delaySeconds < 0 || delaySeconds > 900)) {
      newErrors.delaySeconds = 'Delay deve estar entre 0 e 900 segundos';
    }

    // Attributes validation
    attributes.forEach((attr, index) => {
      if (attr.name && !attr.value) {
        newErrors[`attribute-${index}`] = 'Valor do atributo é obrigatório';
      }
      if (!attr.name && attr.value) {
        newErrors[`attribute-${index}`] = 'Nome do atributo é obrigatório';
      }
      if (attr.name && attr.type === 'Number' && isNaN(Number(attr.value))) {
        newErrors[`attribute-${index}`] = 'Valor deve ser um número válido';
      }
    });

    // Check for duplicate attribute names
    const attrNames = attributes.filter(attr => attr.name).map(attr => attr.name);
    const duplicates = attrNames.filter((name, index) => attrNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      newErrors.general = 'Nomes de atributos duplicados não são permitidos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [messageBody, attributes, delaySeconds, messageGroupId, messageDeduplicationId, jsonMode, jsonValue, isFifoQueue]);

  const buildMessageData = useCallback(() => {
    const messageData: Parameters<typeof onMessageCreated>[0] = {
      body: messageBody
    };

    // Add attributes if any
    if (attributes.length > 0 && attributes.some(attr => attr.name && attr.value)) {
      messageData.attributes = {};
      attributes.forEach(attr => {
        if (attr.name && attr.value) {
          messageData.attributes![attr.name] = {
            DataType: attr.type,
            ...(attr.type === 'Binary' ? { BinaryValue: attr.value } : { StringValue: attr.value })
          };
        }
      });
    }

    // Add optional parameters
    if (delaySeconds !== undefined) {
      messageData.delaySeconds = delaySeconds;
    }

    if (isFifoQueue) {
      if (messageGroupId) messageData.messageGroupId = messageGroupId;
      if (messageDeduplicationId) messageData.messageDeduplicationId = messageDeduplicationId;
    }

    return messageData;
  }, [messageBody, attributes, delaySeconds, messageGroupId, messageDeduplicationId, isFifoQueue]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const messageData = jsonMode ? JSON.parse(jsonValue) : buildMessageData();
      await onMessageCreated(messageData);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Falha ao criar mensagem' });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, jsonMode, jsonValue, buildMessageData, onMessageCreated]);

  const handleJsonModeToggle = useCallback(() => {
    if (!jsonMode) {
      // Convert form to JSON
      const messageData = buildMessageData();
      setJsonValue(JSON.stringify(messageData, null, 2));
    }
    setJsonMode(!jsonMode);
  }, [jsonMode, buildMessageData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Plus className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Criar Nova Mensagem</h2>
              <p className="text-sm text-gray-600">Fila: {queueName}</p>
              {isFifoQueue && (
                <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Fila FIFO
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleJsonModeToggle}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                jsonMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Modo JSON</span>
            </button>
            {!jsonMode && (
              <button
                onClick={addAttribute}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Atributo</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{errors.general}</span>
            </div>
          )}

          {jsonMode ? (
            <JsonTextarea
              value={jsonValue}
              onChange={setJsonValue}
              label="Dados da Mensagem SQS"
              placeholder={`{
  "body": "Conteúdo da mensagem aqui",
  "attributes": {
    "Author": {
      "StringValue": "João Silva",
      "DataType": "String"
    }
  }${!isFifoQueue ? ',\n  "delaySeconds": 10' : ''}${isFifoQueue ? ',\n  "messageGroupId": "grupo-1"' : ''}
}`}
              rows={16}
            />
          ) : (
            <div className="space-y-6">
              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Corpo da Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Digite o conteúdo da mensagem aqui..."
                />
              </div>

              {/* FIFO Queue Fields */}
              {isFifoQueue && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Group ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={messageGroupId}
                      onChange={(e) => setMessageGroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="grupo-mensagens-1"
                    />
                    {errors.messageGroupId && (
                      <p className="text-red-600 text-xs mt-1">{errors.messageGroupId}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Deduplication ID
                    </label>
                    <input
                      type="text"
                      value={messageDeduplicationId}
                      onChange={(e) => setMessageDeduplicationId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="dedup-id-único"
                    />
                  </div>
                </div>
              )}

              {/* Delay Seconds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delay (segundos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="900"
                  value={delaySeconds ?? ''}
                  onChange={(e) => setDelaySeconds(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                {errors.delaySeconds && (
                  <p className="text-red-600 text-xs mt-1">{errors.delaySeconds}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Atraso antes da mensagem ficar disponível (0-900 segundos)
                </p>
              </div>

              {/* Message Attributes */}
              {attributes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Atributos da Mensagem
                  </label>
                  <div className="space-y-3">
                    {attributes.map((attr, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <input
                              type="text"
                              value={attr.name}
                              onChange={(e) => updateAttribute(index, { name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome do atributo"
                            />
                          </div>
                          <div>
                            <select
                              value={attr.type}
                              onChange={(e) => updateAttribute(index, { type: e.target.value as MessageAttribute['type'] })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="String">String</option>
                              <option value="Number">Number</option>
                              <option value="Binary">Binary</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={attr.value}
                              onChange={(e) => updateAttribute(index, { value: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Valor"
                            />
                          </div>
                          <div className="flex items-center">
                            <button
                              onClick={() => removeAttribute(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remover atributo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {errors[`attribute-${index}`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`attribute-${index}`]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Informações</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {isFifoQueue
                    ? 'Filas FIFO garantem ordem das mensagens e deduplicação. Message Group ID é obrigatório.'
                    : 'A mensagem será enviada para a fila padrão. Atributos e delay são opcionais.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}