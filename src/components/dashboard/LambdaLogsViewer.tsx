import { useState, useEffect } from 'react';
import { FileText, Download, Search, Filter, RefreshCw } from 'lucide-react';

interface LogEvent {
  timestamp: number;
  message: string;
  level?: string;
  ingestionTime: number;
}

interface LogStream {
  logStreamName: string;
  creationTime: number;
  lastEventTimestamp: number;
  storedBytes: number;
}

export function LambdaLogsViewer() {
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [logStreams, setLogStreams] = useState<LogStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadLogStreams();
  }, []);

  useEffect(() => {
    if (selectedStream && autoRefresh) {
      const interval = setInterval(loadLogEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedStream, autoRefresh]);

  const loadLogStreams = async () => {
    try {
      setError(null);

      // Try to get real log streams from LocalStack via proxy
      const response = await fetch('/api/localstack/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Logs_20140328.DescribeLogStreams',
        },
        body: JSON.stringify({
          logGroupName: '/aws/lambda/user-analytics-events-events-consumer',
          orderBy: 'LastEventTime',
          descending: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const streams: LogStream[] = data.logStreams || [];
        setLogStreams(streams);

        // Auto-select the most recent stream
        if (streams.length > 0 && !selectedStream) {
          setSelectedStream(streams[0].logStreamName);
          loadLogEvents(streams[0].logStreamName);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn('Could not load log streams, using mock data:', err);

      // Mock log streams
      const mockStreams: LogStream[] = [
        {
          logStreamName: '2025/09/16/[$LATEST]3beeaf961a135e384f265ab6d5aa798b',
          creationTime: Date.now() - 3600000,
          lastEventTimestamp: Date.now() - 60000,
          storedBytes: 125486,
        },
        {
          logStreamName: '2025/09/16/[$LATEST]2abeaf961a135e384f265ab6d5aa798a',
          creationTime: Date.now() - 7200000,
          lastEventTimestamp: Date.now() - 120000,
          storedBytes: 98765,
        },
      ];

      setLogStreams(mockStreams);
      if (!selectedStream) {
        setSelectedStream(mockStreams[0].logStreamName);
        loadMockLogEvents();
      }
      setError('Using mock data - LocalStack connection failed');
    } finally {
      setLoading(false);
    }
  };

  const loadLogEvents = async (streamName?: string) => {
    const stream = streamName || selectedStream;
    if (!stream) return;

    try {
      const response = await fetch('/api/localstack/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Logs_20140328.GetLogEvents',
        },
        body: JSON.stringify({
          logGroupName: '/aws/lambda/user-analytics-events-events-consumer',
          logStreamName: stream,
          startTime: Date.now() - 3600000, // Last hour
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const events: LogEvent[] = data.events || [];

        // Parse log levels from messages
        const parsedEvents = events.map(event => ({
          ...event,
          level: extractLogLevel(event.message),
        }));

        setLogEvents(parsedEvents.reverse()); // Show newest first
      }
    } catch (err) {
      console.warn('Could not load log events:', err);
      loadMockLogEvents();
    }
  };

  const loadMockLogEvents = () => {
    const mockEvents: LogEvent[] = [
      {
        timestamp: Date.now() - 60000,
        message: '[22:49:53.150] INFO: Lambda function started {"component":"AnalyticsEventsConsumer","records":[{"messageId":"37f64aa2-98fc-4d8d-b90f-214e3d5c59b9"}]}',
        level: 'INFO',
        ingestionTime: Date.now() - 59000,
      },
      {
        timestamp: Date.now() - 59000,
        message: '[22:49:53.160] DEBUG: Processing analytics event {"component":"AnalyticsEventsConsumer","messageId":"37f64aa2-98fc-4d8d-b90f-214e3d5c59b9","eventData":{"idStore":123,"platform":"meta","event":"PageView"}}',
        level: 'DEBUG',
        ingestionTime: Date.now() - 58000,
      },
      {
        timestamp: Date.now() - 58000,
        message: '[22:49:53.170] INFO: Sending event to platform {"component":"AnalyticsEventsConsumer","platform":"meta","eventType":"PageView","pixelId":"1234567890123456"}',
        level: 'INFO',
        ingestionTime: Date.now() - 57000,
      },
      {
        timestamp: Date.now() - 57000,
        message: '[22:49:53.270] INFO: Successfully sent event to platform {"component":"AnalyticsEventsConsumer","platform":"meta","eventId":"26d7bf55-3a48-4f64-9fa8-0b062f7471f1"}',
        level: 'INFO',
        ingestionTime: Date.now() - 56000,
      },
      {
        timestamp: Date.now() - 56000,
        message: '[22:49:53.271] INFO: Lambda execution completed {"component":"AnalyticsEventsConsumer","processedMessages":7,"failedMessages":0}',
        level: 'INFO',
        ingestionTime: Date.now() - 55000,
      },
    ];

    setLogEvents(mockEvents);
  };

  const extractLogLevel = (message: string): string => {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    for (const level of levels) {
      if (message.includes(level)) {
        return level;
      }
    }
    return 'INFO';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'DEBUG': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredEvents = logEvents.filter(event => {
    const matchesSearch = searchTerm === '' || event.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || event.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const exportLogs = () => {
    const logsText = filteredEvents
      .map(event => `${new Date(event.timestamp).toISOString()} [${event.level}] ${event.message}`)
      .join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lambda-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Lambda Logs</h2>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={() => loadLogEvents()}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportLogs}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Log Stream</label>
            <select
              value={selectedStream}
              onChange={(e) => {
                setSelectedStream(e.target.value);
                loadLogEvents(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {logStreams.map(stream => (
                <option key={stream.logStreamName} value={stream.logStreamName}>
                  {stream.logStreamName} ({Math.round(stream.storedBytes / 1024)}KB)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Levels</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Log Events</h3>
            <span className="text-sm text-gray-500">
              Showing {filteredEvents.length} of {logEvents.length} events
            </span>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredEvents.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredEvents.map((event, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelColor(event.level || 'INFO')}`}>
                      {event.level || 'INFO'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500 mb-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-900 font-mono whitespace-pre-wrap break-words">
                        {event.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {logEvents.length === 0 ? 'No log events available' : 'No events match your filters'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}