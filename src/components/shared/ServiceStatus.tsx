import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ServiceStatusProps {
  serviceName: string;
  isAvailable: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function ServiceStatus({ serviceName, isAvailable, isLoading = false }: ServiceStatusProps) {
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-blue-800">Verificando disponibilidade do {serviceName}...</p>
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-orange-800 font-medium">Serviço {serviceName} Indisponível</h3>
            <p className="text-orange-700 text-sm mt-1">
              O {serviceName} não está rodando no LocalStack. Você pode:
            </p>
            <ul className="text-orange-700 text-sm mt-2 ml-4 space-y-1">
              <li>• Iniciar o LocalStack com o serviço {serviceName} habilitado</li>
              <li>• Usar outros serviços que estão disponíveis</li>
              <li>• Aguardar o serviço ser iniciado e a página será atualizada automaticamente</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
      <div className="flex items-center">
        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
        <p className="text-green-800 text-sm font-medium">{serviceName} disponível</p>
      </div>
    </div>
  );
}

interface ServiceWrapperProps {
  serviceName: string;
  isAvailable: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function ServiceWrapper({ serviceName, isAvailable, isLoading = false, children }: ServiceWrapperProps) {
  return (
    <div>
      <ServiceStatus serviceName={serviceName} isAvailable={isAvailable} isLoading={isLoading} />
      {isAvailable && children}
    </div>
  );
}