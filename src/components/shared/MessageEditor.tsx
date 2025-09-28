import { AlertCircle, Edit, Save, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { SQSMessage, SQSMessageAttributes } from '../../types/api/aws-api';
import { JsonTextarea } from './JsonTextarea';

interface MessageEditorProps {
  queueName: string;
  message: SQSMessage;
  onMessageUpdated: (messageData: {
    body: string;
    attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
  }) => void;
  onCancel: () => void;
}

export function MessageEditor({ queueName, message, onMessageUpdated, onCancel }: MessageEditorProps) {
  const [jsonValue, setJsonValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with the message data
  useEffect(() => {
    const messageData = {
      body: message.Body,
      ...(message.MessageAttributes && Object.keys(message.MessageAttributes).length > 0 && {
        attributes: message.MessageAttributes
      })
    };
    setJsonValue(JSON.stringify(messageData, null, 2));
  }, [message]);

  const validateAndSubmit = useCallback(async () => {
    try {
      // Validate JSON
      const parsedMessage = JSON.parse(jsonValue);

      if (!parsedMessage || typeof parsedMessage !== 'object') {
        setErrors({ general: 'Mensagem deve ser um objeto JSON válido' });
        return;
      }

      if (!parsedMessage.body || typeof parsedMessage.body !== 'string') {
        setErrors({ general: 'Campo "body" é obrigatório e deve ser uma string' });
        return;
      }

      // Validate attributes if present
      if (parsedMessage.attributes) {
        if (typeof parsedMessage.attributes !== 'object') {
          setErrors({ general: 'Atributos devem ser um objeto válido' });
          return;
        }

        // Validate each attribute structure
        for (const [attrName, attrValue] of Object.entries(parsedMessage.attributes)) {
          if (!attrValue || typeof attrValue !== 'object') {
            setErrors({ general: `Atributo "${attrName}" deve ser um objeto válido` });
            return;
          }

          const attr = attrValue as SQSMessageAttributes;
          if (!attr.DataType) {
            setErrors({ general: `Atributo "${attrName}" deve ter um DataType` });
            return;
          }

          if (!attr.StringValue && !attr.BinaryValue) {
            setErrors({ general: `Atributo "${attrName}" deve ter StringValue ou BinaryValue` });
            return;
          }
        }
      }

      setIsSubmitting(true);
      setErrors({});

      await onMessageUpdated(parsedMessage);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setErrors({ general: 'JSON inválido. Verifique a sintaxe.' });
      } else {
        setErrors({ general: error instanceof Error ? error.message : 'Falha ao atualizar mensagem' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [jsonValue, onMessageUpdated]);

  // const getMessagePreview = () => {
  //   try {
  //     const parsed = JSON.parse(jsonValue);
  //     const preview = [];

  //     // Show message body preview
  //     if (parsed.body) {
  //       const bodyPreview = parsed.body.length > 100
  //         ? parsed.body.substring(0, 100) + '...'
  //         : parsed.body;
  //       preview.push(`Corpo: ${bodyPreview}`);
  //     }

  //     // Show attributes count
  //     if (parsed.attributes && Object.keys(parsed.attributes).length > 0) {
  //       const attrCount = Object.keys(parsed.attributes).length;
  //       const attrNames = Object.keys(parsed.attributes).slice(0, 3).join(', ');
  //       preview.push(`Atributos (${attrCount}): ${attrNames}${attrCount > 3 ? '...' : ''}`);
  //     }

  //     return preview.join(' | ');
  //   } catch {
  //     return 'JSON inválido';
  //   }
  // };

  const getMessageId = () => {
    if (message.MessageId.length > 20) {
      return message.MessageId.substring(0, 20) + '...';
    }
    return message.MessageId;
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
            <Edit className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Editar Mensagem</h2>
              <p className="text-sm text-gray-600">Fila: {queueName}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">ID: {getMessageId()}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{errors.general}</span>
            </div>
          )}

          {/* Message Preview */}
          {/* <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Preview da Mensagem</span>
            </div>
            <p className="text-sm text-blue-700 font-mono break-words whitespace-pre-wrap overflow-hidden">
              {getMessagePreview()}
            </p>
          </div> */}

          {/* JSON Editor */}
          <JsonTextarea
            value={jsonValue}
            onChange={setJsonValue}
            label="Dados da Mensagem SQS"
            error={errors.json}
            rows={16}
            placeholder={`{
  "body": "Conteúdo atualizado da mensagem",
  "attributes": {
    "Author": {
      "StringValue": "João Silva",
      "DataType": "String"
    },
    "Priority": {
      "StringValue": "High",
      "DataType": "String"
    }
  }
}`}
          />

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Atenção</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Editar uma mensagem SQS criará uma nova mensagem e removerá a original.
              O ID da mensagem será alterado após a atualização.
            </p>
          </div>

          {/* Message Info */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Tentativas de Recebimento:</span>{' '}
                  {message.Attributes?.ApproximateReceiveCount || '0'}
                </div>
                <div>
                  <span className="font-medium">MD5 do Corpo:</span>{' '}
                  <span className="font-mono text-xs">{message.MD5OfBody.substring(0, 16)}...</span>
                </div>
                {message.Attributes?.SentTimestamp && (
                  <div>
                    <span className="font-medium">Enviada em:</span>{' '}
                    {new Date(parseInt(message.Attributes.SentTimestamp)).toLocaleString('pt-BR')}
                  </div>
                )}
                {message.Attributes?.ApproximateFirstReceiveTimestamp && (
                  <div>
                    <span className="font-medium">Primeiro Recebimento:</span>{' '}
                    {new Date(parseInt(message.Attributes.ApproximateFirstReceiveTimestamp)).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={validateAndSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}