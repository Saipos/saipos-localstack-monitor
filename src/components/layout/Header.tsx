import { Activity, Database, MessageSquare, FileText, Eye, Bug } from 'lucide-react';
import saiposLogo from '../../assets/logo.png';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: Eye },
    { id: 'tokens', name: 'DynamoDB', icon: Database },
    { id: 'queue', name: 'SQS', icon: MessageSquare },
    { id: 'logs', name: 'Logs', icon: FileText },
    { id: 'debug', name: 'Debug & Teste', icon: Bug },
  ];

  return (
    <header className="bg-white shadow-lg border-b border-saipos-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <img
              src={saiposLogo}
              alt="Saipos Logo"
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-saipos-gray-900 tracking-tight">LocalStack Monitor</h1>
              <p className="text-sm text-saipos-gray-600 font-medium">Monitoramento completo dos serviços AWS</p>
            </div>
          </div>

          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm
                    ${activeTab === tab.id
                      ? 'bg-saipos-blue-100 text-saipos-blue-700 shadow-md border border-saipos-blue-200'
                      : 'text-saipos-gray-600 hover:text-saipos-blue-700 hover:bg-saipos-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}