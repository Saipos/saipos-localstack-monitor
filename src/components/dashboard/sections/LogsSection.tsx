import { useState } from 'react';
import { FileText, Eye, X } from 'lucide-react';
import type { LogGroup, LogEvent } from '../../../types';
import { formatBytes, formatTimestamp } from '../../../utils/formatters';
import { LocalStackApiService } from '../../../services/localstack-api';

interface LogsSectionProps {
  logGroups: LogGroup[];
  isServiceAvailable: boolean;
}

export function LogsSection({ logGroups, isServiceAvailable }: LogsSectionProps) {
  const [selectedLogGroup, setSelectedLogGroup] = useState<string | null>(null);
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const handleLogGroupClick = async (logGroupName: string) => {
    if (selectedLogGroup === logGroupName) {
      setSelectedLogGroup(null);
      setLogEvents([]);
      return;
    }

    setSelectedLogGroup(logGroupName);
    setLoadingEvents(true);

    try {
      const events = await LocalStackApiService.getLogEvents(logGroupName);
      setLogEvents(events);
    } catch (error) {
      console.error(`Failed to load events for log group ${logGroupName}:`, error);
      setLogEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  if (!isServiceAvailable) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2 text-purple-700">
          <FileText className="w-5 h-5" />
          <h3 className="font-semibold">CloudWatch Logs Indisponível</h3>
        </div>
        <p className="text-purple-600 text-sm mt-1">
          O serviço CloudWatch Logs não está disponível no momento.
        </p>
      </div>
    );
  }

  if (logGroups.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhum Log Group Encontrado
          </h3>
          <p className="text-gray-600">
            Não há log groups disponíveis no CloudWatch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">CloudWatch Logs</h3>
        <span className="text-sm text-gray-500">({logGroups.length} grupos)</span>
      </div>

      <div className="grid gap-4">
        {logGroups.map((group) => (
          <div key={group.logGroupName} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-800">{group.logGroupName}</h4>
                  <span className="text-sm text-gray-500">
                    {formatBytes(group.storedBytes)} • {group.metricFilterCount} filters
                  </span>
                </div>

                {group.retentionInDays && (
                  <div className="mt-1 text-xs text-gray-500">
                    Retenção: {group.retentionInDays} dias
                  </div>
                )}
              </div>

              <button
                onClick={() => handleLogGroupClick(group.logGroupName)}
                className="flex items-center space-x-1 px-3 py-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">
                  {selectedLogGroup === group.logGroupName ? 'Ocultar' : 'Ver Logs'}
                </span>
              </button>
            </div>

            {selectedLogGroup === group.logGroupName && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-700">
                    Eventos Recentes (10 últimos)
                  </h5>
                  <button
                    onClick={() => setSelectedLogGroup(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loadingEvents ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : logEvents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logEvents.slice(0, 10).map((event, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-gray-500">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <div className="text-gray-700 font-mono text-xs whitespace-pre-wrap break-all">
                          {event.message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    Nenhum evento encontrado neste log group.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}