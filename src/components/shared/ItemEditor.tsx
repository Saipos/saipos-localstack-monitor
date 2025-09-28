import { Edit, X, Save, AlertCircle } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { JsonTextarea } from './JsonTextarea';
import type { DynamoDBRawItem } from '../../types';

interface ItemEditorProps {
  tableName: string;
  item: DynamoDBRawItem;
  onItemUpdated: (item: DynamoDBRawItem) => void;
  onCancel: () => void;
}

export function ItemEditor({ tableName, item, onItemUpdated, onCancel }: ItemEditorProps) {
  const [jsonValue, setJsonValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with the item data
  useEffect(() => {
    setJsonValue(JSON.stringify(item, null, 2));
  }, [item]);

  const validateAndSubmit = useCallback(async () => {
    try {
      // Validate JSON
      const parsedItem = JSON.parse(jsonValue);

      if (!parsedItem || typeof parsedItem !== 'object') {
        setErrors({ general: 'Item deve ser um objeto JSON válido' });
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      await onItemUpdated(parsedItem);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setErrors({ general: 'JSON inválido. Verifique a sintaxe.' });
      } else {
        setErrors({ general: error instanceof Error ? error.message : 'Falha ao atualizar item' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [jsonValue, onItemUpdated]);

  const getItemPreview = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      const keys = Object.keys(parsed).slice(0, 3);
      const keyValuePairs = keys.map(key => {
        const value = parsed[key];
        let displayValue = 'N/A';

        if (value && typeof value === 'object') {
          if (value.S) displayValue = value.S;
          else if (value.N) displayValue = value.N;
          else if (value.BOOL !== undefined) displayValue = value.BOOL.toString();
          else displayValue = JSON.stringify(value);
        }

        // Limita o tamanho do valor para evitar quebra de layout
        if (displayValue.length > 50) {
          displayValue = displayValue.substring(0, 50) + '...';
        }

        return `${key}: ${displayValue}`;
      });

      const preview = keyValuePairs.join(', ');

      // Limita o tamanho total da linha do preview
      return preview.length > 150 ? preview.substring(0, 150) + '...' : preview;
    } catch {
      return 'JSON inválido';
    }
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
              <h2 className="text-xl font-bold text-gray-900">Editar Item</h2>
              <p className="text-sm text-gray-600">Tabela: {tableName}</p>
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

          {/* Item Preview */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Edit className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Preview do Item</span>
            </div>
            <p className="text-sm text-blue-700 font-mono break-words whitespace-pre-wrap overflow-hidden">
              {getItemPreview()}
            </p>
          </div>

          {/* JSON Editor */}
          <JsonTextarea
            value={jsonValue}
            onChange={setJsonValue}
            label="Item JSON do DynamoDB"
            error={errors.json}
            rows={16}
            placeholder='{\n  "id": {"S": "exemplo-id"},\n  "nome": {"S": "Nome Atualizado"}\n}'
          />

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Atenção</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Certifique-se de manter as chaves primárias corretas. Alterar chaves primárias pode resultar em erro.
            </p>
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