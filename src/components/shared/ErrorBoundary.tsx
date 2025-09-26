import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const isLocalStackError = this.state.error?.message?.includes('500') ||
                               this.state.error?.message?.includes('Failed to load resource');

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800">
                {isLocalStackError ? 'Erro de Conectividade' : (this.props.fallbackTitle || 'Algo deu errado')}
              </h3>

              <div className="mt-2 text-sm text-red-700">
                {isLocalStackError ? (
                  <div className="space-y-2">
                    <p>Não foi possível conectar ao LocalStack. Verifique se:</p>
                    <ul className="list-disc list-inside space-y-1 text-red-600">
                      <li>O LocalStack está rodando no Docker</li>
                      <li>A porta 4566 está acessível</li>
                      <li>Não há problemas de rede</li>
                    </ul>

                    <div className="mt-3 p-3 bg-red-100 rounded border">
                      <p className="font-medium text-red-800">Comando para iniciar LocalStack:</p>
                      <code className="block mt-1 p-2 bg-red-200 rounded text-sm">
                        docker run --rm -it -p 4566:4566 localstack/localstack
                      </code>
                    </div>
                  </div>
                ) : (
                  <p>{this.props.fallbackMessage || 'Ocorreu um erro inesperado ao carregar este componente.'}</p>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-red-800">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 rounded text-xs">
                    <pre className="whitespace-pre-wrap text-red-700">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              <div className="mt-4 flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center space-x-2 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  Recarregar Página
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}