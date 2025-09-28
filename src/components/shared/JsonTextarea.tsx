import { Code, AlertCircle, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface JsonTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  rows?: number;
}

export function JsonTextarea({
  value,
  onChange,
  placeholder = '{\n  "campo": {"S": "valor"}\n}',
  label = "JSON do DynamoDB",
  error,
  className = "",
  rows = 12
}: JsonTextareaProps) {
  const [isValid, setIsValid] = useState(true);
  const [formatted, setFormatted] = useState(false);

  // Validate JSON on value change
  useEffect(() => {
    if (!value.trim()) {
      setIsValid(true);
      return;
    }

    try {
      JSON.parse(value);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  }, [value]);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(value);
      const prettified = JSON.stringify(parsed, null, 2);
      onChange(prettified);
      setFormatted(true);
      setTimeout(() => setFormatted(false), 1000);
    } catch {
      // Invalid JSON, don't format
    }
  };

  const getStatusIcon = () => {
    if (!value.trim()) return null;

    if (formatted) {
      return <Check className="w-4 h-4 text-green-600" />;
    }

    if (isValid) {
      return <Check className="w-4 h-4 text-green-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusMessage = () => {
    if (!value.trim()) return null;

    if (formatted) {
      return <span className="text-green-600">JSON formatado!</span>;
    }

    if (isValid) {
      return <span className="text-green-600">JSON válido</span>;
    } else {
      return <span className="text-red-600">JSON inválido</span>;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with label and format button */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <button
            type="button"
            onClick={formatJson}
            disabled={!isValid || !value.trim()}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Formatar JSON"
          >
            <Code className="w-3 h-3" />
            <span>Formatar</span>
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-3 py-2 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 transition-colors ${
            error
              ? 'border-red-300 focus:ring-red-500'
              : !value.trim()
              ? 'border-gray-300 focus:ring-blue-500'
              : isValid
              ? 'border-green-300 focus:ring-green-500 bg-green-50/30'
              : 'border-red-300 focus:ring-red-500 bg-red-50/30'
          }`}
        />

        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-1 rounded">
          {value.length} chars
        </div>
      </div>

      {/* Status and error messages */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {getStatusMessage()}
        </div>

        {error && (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500">
        <div className="flex items-center space-x-1 mb-1">
          <Code className="w-3 h-3" />
          <span>Use o formato JSON do DynamoDB com descritores de tipo (S, N, B, etc.)</span>
        </div>
        <div className="pl-4 text-gray-400">
          Exemplo: <code className="bg-gray-100 px-1 rounded">{"{"}"id": {"{"}"S": "123"{"}"}, "nome": {"{"}"S": "João"{"}"}{"}"}
        </code>
        </div>
      </div>
    </div>
  );
}