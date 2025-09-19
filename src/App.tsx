import { useState } from 'react';
import { Header } from './components/layout/Header';
import saiposLogo from './assets/logo.png';
import { DebugTestPanel } from './components/dashboard/DebugTestPanel';
import { DynamoDBView } from './components/dashboard/DynamoDBView';
import { SQSView } from './components/dashboard/SQSView';
import { LambdaLogsViewer } from './components/dashboard/LambdaLogsViewer';
import { BasicLocalStackDashboard } from './components/dashboard/BasicLocalStackDashboard';
import { ProjectSelector, type ProjectMode } from './components/shared/ProjectSelector';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <BasicLocalStackDashboard onTabChange={setActiveTab} />;
      case 'tokens':
        return <DynamoDBView />;
      case 'queue':
        return <SQSView />;
      case 'logs':
        return <LambdaLogsViewer />;
      case 'debug':
        return <DebugTestPanel />;
      default:
        return <BasicLocalStackDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-saipos-gray-50 to-saipos-gray-100 font-poppins">

      {/* Navigation tabs */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-saipos-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src={saiposLogo}
                alt="Saipos Logo"
                className="h-6 w-auto"
              />
              <p className="text-saipos-gray-600 text-sm font-medium">
                LocalStack Monitor - Serviços AWS Completos
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-saipos-gray-600">
              <span className="font-medium">Connected to LocalStack</span>
              <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;