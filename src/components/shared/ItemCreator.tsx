import {
  Plus,
  Key,
  X,
  Save,
  AlertCircle,
  Info,
  Trash2,
  Code
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { JsonTextarea } from './JsonTextarea';
import type { DynamoFormField, DynamoDBRawItem } from '../../types';

interface ItemCreatorProps {
  tableName: string;
  tableSchema: {
    keySchema: Array<{
      AttributeName: string;
      KeyType: 'HASH' | 'RANGE';
    }>;
    attributeDefinitions: Array<{
      AttributeName: string;
      AttributeType: 'S' | 'N' | 'B';
    }>;
  };
  onItemCreated: (item: DynamoDBRawItem) => void;
  onCancel: () => void;
}

export function ItemCreator({ tableName, tableSchema, onItemCreated, onCancel }: ItemCreatorProps) {
  // Initialize form fields based on key schema
  const [fields, setFields] = useState<DynamoFormField[]>(() => {
    const keyFields = tableSchema.keySchema.map(key => {
      const attrDef = tableSchema.attributeDefinitions.find(attr => attr.AttributeName === key.AttributeName);
      return {
        name: key.AttributeName,
        type: attrDef?.AttributeType || 'S' as 'S' | 'N' | 'B',
        required: true,
        isKey: true,
        keyType: key.KeyType,
        value: '',
        placeholder: key.KeyType === 'HASH' ? 'Valor da chave de partição' : 'Valor da chave de ordenação',
        description: key.KeyType === 'HASH' ? 'Chave primária de partição' : 'Chave primária de ordenação'
      };
    });
    return keyFields;
  });

  const [jsonMode, setJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addField = useCallback(() => {
    const newField: DynamoFormField = {
      name: '',
      type: 'S',
      required: false,
      isKey: false,
      value: '',
      placeholder: 'Digite o nome do campo',
      description: 'Atributo personalizado'
    };
    setFields(prev => [...prev, newField]);
  }, []);

  const updateField = useCallback((index: number, updates: Partial<DynamoFormField>) => {
    setFields(prev => prev.map((field, i) => i === index ? { ...field, ...updates } : field));
    // Clear field-specific errors when updating
    if (updates.name || updates.value) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`field-${index}`];
        return newErrors;
      });
    }
  }, []);

  const removeField = useCallback((index: number) => {
    const field = fields[index];
    if (!field.isKey) { // Don't allow removing key fields
      setFields(prev => prev.filter((_, i) => i !== index));
    }
  }, [fields]);


  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // JSON mode validation
    if (jsonMode) {
      if (!jsonValue.trim()) {
        newErrors.general = 'JSON é obrigatório';
        setErrors(newErrors);
        return false;
      }

      try {
        const parsed = JSON.parse(jsonValue);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          newErrors.general = 'JSON deve ser um objeto válido';
        }
      } catch {
        newErrors.general = 'JSON inválido. Verifique a sintaxe.';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Form mode validation
    const fieldNames = fields.map(f => f.name).filter(Boolean);
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);

    // Check if at least one field is filled
    const hasAnyValue = fields.some(field => field.value && field.value.toString().trim() !== '');
    if (!hasAnyValue) {
      newErrors.general = 'Pelo menos um campo deve ser preenchido';
    }

    fields.forEach((field, index) => {
      // Required fields
      if (field.required && (!field.value || field.value.toString().trim() === '')) {
        newErrors[`field-${index}`] = `${field.name || 'Este campo'} é obrigatório`;
      }

      // Field name required for non-key fields
      if (!field.name && !field.isKey) {
        newErrors[`field-${index}`] = 'Nome do campo é obrigatório';
      }

      // Duplicate names
      if (duplicates.includes(field.name)) {
        newErrors[`field-${index}`] = 'Nome de campo duplicado';
      }

      // Type-specific validation
      if (field.value) {
        switch (field.type) {
          case 'N':
            if (isNaN(Number(field.value))) {
              newErrors[`field-${index}`] = 'Deve ser um número válido';
            }
            break;
          case 'BOOL':
            if (!['true', 'false'].includes(field.value.toString().toLowerCase())) {
              newErrors[`field-${index}`] = 'Deve ser verdadeiro ou falso';
            }
            break;
          case 'SS':
          case 'NS':
            try {
              const parsed = JSON.parse(field.value);
              if (!Array.isArray(parsed)) {
                newErrors[`field-${index}`] = 'Deve ser um array JSON válido';
              }
            } catch {
              newErrors[`field-${index}`] = 'Deve ser um array JSON válido';
            }
            break;
          case 'M':
            try {
              const parsed = JSON.parse(field.value);
              if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                newErrors[`field-${index}`] = 'Deve ser um objeto JSON válido';
              }
            } catch {
              newErrors[`field-${index}`] = 'Deve ser um objeto JSON válido';
            }
            break;
          case 'L':
            try {
              JSON.parse(field.value);
            } catch {
              newErrors[`field-${index}`] = 'Deve ser um JSON válido';
            }
            break;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, jsonMode, jsonValue]);

  const buildDynamoDBItem = useCallback(() => {
    const item: DynamoDBRawItem = {};

    fields.forEach(field => {
      if (field.name && field.value !== undefined && field.value !== '') {
        switch (field.type) {
          case 'S':
            item[field.name] = { S: field.value.toString() };
            break;
          case 'N':
            item[field.name] = { N: field.value.toString() };
            break;
          case 'B':
            item[field.name] = { B: field.value };
            break;
          case 'BOOL':
            item[field.name] = { BOOL: field.value.toString().toLowerCase() === 'true' };
            break;
          case 'SS':
            item[field.name] = { SS: JSON.parse(field.value) };
            break;
          case 'NS':
            item[field.name] = { NS: JSON.parse(field.value).map((n: string | number) => n.toString()) };
            break;
          case 'M':
            item[field.name] = { M: JSON.parse(field.value) };
            break;
          case 'L':
            item[field.name] = { L: JSON.parse(field.value) };
            break;
        }
      }
    });

    return item;
  }, [fields]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const item = jsonMode ? JSON.parse(jsonValue) : buildDynamoDBItem();
      await onItemCreated(item);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Falha ao criar item' });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, jsonMode, jsonValue, buildDynamoDBItem, onItemCreated]);

  const handleJsonModeToggle = useCallback(() => {
    if (!jsonMode) {
      // Convert form to JSON
      const item = buildDynamoDBItem();
      setJsonValue(JSON.stringify(item, null, 2));
    }
    setJsonMode(!jsonMode);
  }, [jsonMode, buildDynamoDBItem]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Plus className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Criar Novo Item</h2>
              <p className="text-sm text-gray-600">Tabela: {tableName}</p>
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
                onClick={addField}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Campo</span>
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
              label="Item JSON do DynamoDB"
              placeholder='{\n  "id": {"S": "exemplo-id"},\n  "nome": {"S": "Nome do Exemplo"},\n  "contador": {"N": "42"}\n}'
              rows={16}
            />
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      {/* Field Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome do Campo
                          {field.isKey && <Key className="w-3 h-3 inline ml-1 text-blue-600" />}
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                          disabled={field.isKey}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            field.isKey ? 'bg-gray-50 text-gray-600' : 'border-gray-300'
                          }`}
                          placeholder={field.keyType === 'HASH' ? 'Chave de partição' : field.keyType === 'RANGE' ? 'Chave de ordenação' : 'Digite o nome do campo'}
                        />
                      </div>

                      {/* Type Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as DynamoFormField['type'], value: '' })}
                          disabled={field.isKey}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            field.isKey ? 'bg-gray-50 text-gray-600' : 'border-gray-300'
                          }`}
                        >
                          <option value="S">🔤 String</option>
                          <option value="N">🔢 Número</option>
                          <option value="B">📁 Binário</option>
                          <option value="BOOL">✓ Boolean</option>
                          <option value="SS">📝[] Set de Strings</option>
                          <option value="NS">🔢[] Set de Números</option>
                          <option value="M">{`{}`} Mapa</option>
                          <option value="L">[] Lista</option>
                        </select>
                      </div>

                      {/* Value */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valor {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'BOOL' ? (
                          <select
                            value={field.value}
                            onChange={(e) => updateField(index, { value: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecionar...</option>
                            <option value="true">Verdadeiro</option>
                            <option value="false">Falso</option>
                          </select>
                        ) : (
                          <input
                            type={field.type === 'N' ? 'number' : 'text'}
                            value={field.value}
                            onChange={(e) => updateField(index, { value: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={
                              ['M', 'L', 'SS', 'NS'].includes(field.type)
                                ? 'Digite JSON válido'
                                : field.type === 'N'
                                ? '42'
                                : 'Digite o valor'
                            }
                          />
                        )}
                        {errors[`field-${index}`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`field-${index}`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    {!field.isKey && (
                      <button
                        onClick={() => removeField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover campo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {field.description && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                      <Info className="w-3 h-3" />
                      <span>{field.description}</span>
                    </div>
                  )}
                </div>
              ))}
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
            <span>{isSubmitting ? 'Criando...' : 'Criar Item'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}