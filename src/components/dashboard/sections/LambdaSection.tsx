import { Zap, Eye } from 'lucide-react';
import type { LambdaFunction } from '../../../types';
import { formatBytes } from '../../../utils/formatters';

interface LambdaSectionProps {
  functions: LambdaFunction[];
  isServiceAvailable: boolean;
  onFunctionSelect?: (functionName: string) => void;
}

export function LambdaSection({
  functions,
  isServiceAvailable,
  onFunctionSelect
}: LambdaSectionProps) {
  if (!isServiceAvailable) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 text-yellow-700">
          <Zap className="w-5 h-5" />
          <h3 className="font-semibold">Lambda Indisponível</h3>
        </div>
        <p className="text-yellow-600 text-sm mt-1">
          O serviço Lambda não está disponível no momento.
        </p>
      </div>
    );
  }

  if (functions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="text-center">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma Função Encontrada
          </h3>
          <p className="text-gray-600">
            Não há funções Lambda disponíveis no LocalStack.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-800">Funções Lambda</h3>
        <span className="text-sm text-gray-500">({functions.length} funções)</span>
      </div>

      <div className="grid gap-4">
        {functions.map((func) => (
          <div key={func.FunctionName} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-800">{func.FunctionName}</h4>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {func.Runtime}
                  </span>
                  {func.State && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      func.State === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {func.State}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div className="flex items-center space-x-4">
                    <span>Handler: {func.Handler}</span>
                    <span>Timeout: {func.Timeout}s</span>
                    <span>Memory: {func.MemorySize}MB</span>
                    <span>Size: {formatBytes(func.CodeSize)}</span>
                  </div>

                  {func.Description && (
                    <div className="text-gray-500">
                      {func.Description}
                    </div>
                  )}
                </div>
              </div>

              {onFunctionSelect && (
                <button
                  onClick={() => onFunctionSelect(func.FunctionName)}
                  className="flex items-center space-x-1 px-3 py-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Detalhes</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}