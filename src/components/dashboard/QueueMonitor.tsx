import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Activity, TrendingUp, RefreshCw } from 'lucide-react';
import { MetricCard } from '../shared/MetricCard';

interface QueueMetrics {
  visibleMessages: number;
  notVisibleMessages: number;
  totalMessages: number;
  approximateAgeOfOldestMessage: number;
  lastUpdated: Date;
}

interface QueueHistoryPoint {
  timestamp: Date;
  visible: number;
  processing: number;
  total: number;
}

export function QueueMonitor() {
  const [metrics, setMetrics] = useState<QueueMetrics>({
    visibleMessages: 0,
    notVisibleMessages: 0,
    totalMessages: 0,
    approximateAgeOfOldestMessage: 0,
    lastUpdated: new Date(),
  });

  const [history, setHistory] = useState<QueueHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadQueueMetrics();
    const interval = setInterval(loadQueueMetrics, 2000); // Update every 2 seconds for real-time monitoring
    return () => clearInterval(interval);
  }, []);

  const loadQueueMetrics = async () => {
    try {
      setError(null);

      // Try to get real queue data from LocalStack via proxy
      const response = await fetch('/api/localstack/?Action=GetQueueAttributes&QueueUrl=http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/user-analytics-events-events.fifo&AttributeName.1=All&Version=2012-11-05');

      if (response.ok) {
        const text = await response.text();

        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        const getAttributeValue = (name: string) => {
          const elements = xmlDoc.getElementsByTagName('Attribute');
          for (let i = 0; i < elements.length; i++) {
            const nameElement = elements[i].getElementsByTagName('Name')[0];
            if (nameElement?.textContent === name) {
              const valueElement = elements[i].getElementsByTagName('Value')[0];
              return parseInt(valueElement?.textContent || '0');
            }
          }
          return 0;
        };

        const newMetrics: QueueMetrics = {
          visibleMessages: getAttributeValue('ApproximateNumberOfMessages'),
          notVisibleMessages: getAttributeValue('ApproximateNumberOfMessagesNotVisible'),
          totalMessages: 0,
          approximateAgeOfOldestMessage: getAttributeValue('ApproximateAgeOfOldestMessage'),
          lastUpdated: new Date(),
        };

        newMetrics.totalMessages = newMetrics.visibleMessages + newMetrics.notVisibleMessages;
        setMetrics(newMetrics);
        setIsConnected(true);

        // Add to history (keep last 50 points)
        setHistory(prev => {
          const newPoint: QueueHistoryPoint = {
            timestamp: new Date(),
            visible: newMetrics.visibleMessages,
            processing: newMetrics.notVisibleMessages,
            total: newMetrics.totalMessages,
          };
          return [...prev.slice(-49), newPoint];
        });

      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn('Could not load real queue data, using mock data:', err);

      // Use mock data with some variation
      const mockMetrics: QueueMetrics = {
        visibleMessages: Math.floor(Math.random() * 5),
        notVisibleMessages: Math.floor(Math.random() * 3),
        totalMessages: 0,
        approximateAgeOfOldestMessage: Math.floor(Math.random() * 30),
        lastUpdated: new Date(),
      };
      mockMetrics.totalMessages = mockMetrics.visibleMessages + mockMetrics.notVisibleMessages;

      setMetrics(mockMetrics);
      setIsConnected(false);
      setError('Using mock data - LocalStack connection failed');

      // Add mock history point
      setHistory(prev => {
        const newPoint: QueueHistoryPoint = {
          timestamp: new Date(),
          visible: mockMetrics.visibleMessages,
          processing: mockMetrics.notVisibleMessages,
          total: mockMetrics.totalMessages,
        };
        return [...prev.slice(-49), newPoint];
      });
    } finally {
      setLoading(false);
    }
  };

  const getQueueStatus = () => {
    if (metrics.totalMessages === 0) return { status: 'Idle', color: 'text-green-600 bg-green-50' };
    if (metrics.visibleMessages > 10) return { status: 'Backlog', color: 'text-red-600 bg-red-50' };
    if (metrics.notVisibleMessages > 0) return { status: 'Processing', color: 'text-blue-600 bg-blue-50' };
    return { status: 'Active', color: 'text-yellow-600 bg-yellow-50' };
  };

  const queueStatus = getQueueStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">SQS Queue Monitor</h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${queueStatus.color}`}>
            {queueStatus.status}
          </span>
          <button
            onClick={loadQueueMetrics}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Visible Messages"
          value={metrics.visibleMessages}
          subtitle="Waiting to process"
          icon={MessageSquare}
          color="yellow"
        />

        <MetricCard
          title="Processing"
          value={metrics.notVisibleMessages}
          subtitle="Being processed"
          icon={Clock}
          color="purple"
        />

        <MetricCard
          title="Total in Queue"
          value={metrics.totalMessages}
          subtitle="Visible + Processing"
          icon={Activity}
          color="blue"
        />

        <MetricCard
          title="Oldest Message"
          value={`${metrics.approximateAgeOfOldestMessage}s`}
          subtitle="Age in seconds"
          icon={TrendingUp}
          color="gray"
        />
      </div>

      {/* Real-time Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Activity (Last 50 Updates)</h3>

        {history.length > 0 ? (
          <div className="h-64 flex items-end space-x-1 overflow-hidden">
            {history.map((point, index) => {
              const maxValue = Math.max(...history.map(p => p.total)) || 1;
              const visibleHeight = (point.visible / maxValue) * 200;
              const processingHeight = (point.processing / maxValue) * 200;

              return (
                <div key={index} className="flex flex-col items-center space-y-1 min-w-[8px]">
                  {/* Processing bar (purple) */}
                  <div
                    className="w-2 bg-purple-500 rounded-t"
                    style={{ height: `${processingHeight}px` }}
                    title={`Processing: ${point.processing} at ${point.timestamp.toLocaleTimeString()}`}
                  />
                  {/* Visible bar (yellow) */}
                  <div
                    className="w-2 bg-yellow-500"
                    style={{ height: `${visibleHeight}px` }}
                    title={`Visible: ${point.visible} at ${point.timestamp.toLocaleTimeString()}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data available yet...
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Visible Messages</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Processing Messages</span>
            </div>
          </div>
          <span>Last updated: {metrics.lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Queue Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Configuration</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Queue Type:</span>
              <span className="font-medium">FIFO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Batch Size:</span>
              <span className="font-medium">10 messages</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Visibility Timeout:</span>
              <span className="font-medium">30 seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Message Retention:</span>
              <span className="font-medium">14 days</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm">
                {isConnected ? 'Connected to LocalStack' : 'Using Mock Data'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Queue URL: user-analytics-events-events.fifo
            </div>
            <div className="text-xs text-gray-500">
              Updates every 2 seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}