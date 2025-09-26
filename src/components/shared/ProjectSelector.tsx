import { Database } from 'lucide-react';

export type ProjectMode = 'basic';

const project = {
  id: 'basic' as ProjectMode,
  name: 'LocalStack Monitor',
  description: 'Monitoramento completo dos serviços AWS',
  icon: Database,
  color: 'text-blue-600',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200'
};

export function ProjectSelector() {
  return (
    <div className="relative">
      <div className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-64">
        <div className={`p-2 rounded-lg ${project.bgColor} ${project.borderColor} border`}>
          <project.icon className={`w-4 h-4 ${project.color}`} />
        </div>

        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900 text-sm">
            {project.name}
          </div>
          <div className="text-xs text-gray-500">
            {project.description}
          </div>
        </div>

        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>
    </div>
  );
}