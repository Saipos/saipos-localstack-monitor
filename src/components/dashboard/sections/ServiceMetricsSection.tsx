import { Database, MessageSquare, Zap, FileText } from 'lucide-react';
import { MetricCard } from '../../shared/MetricCard';
import type { ServiceStats, ServiceAvailability } from '../../../types';
import { formatBytes } from '../../../utils/formatters';

interface ServiceMetricsSectionProps {
  stats: ServiceStats;
  serviceAvailability: ServiceAvailability;
  onTabChange?: (tab: string) => void;
}

export function ServiceMetricsSection({
  stats,
  serviceAvailability,
  onTabChange
}: ServiceMetricsSectionProps) {
  const handleCardClick = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="DynamoDB"
        value={stats.dynamodb.totalTables.toString()}
        subtitle={serviceAvailability.dynamodb
          ? `${stats.dynamodb.totalItems} items total`
          : "Serviço indisponível"
        }
        icon={Database}
        color="blue"
        onClick={() => handleCardClick('tokens')}
        className="cursor-pointer hover:shadow-lg transition-shadow"
      />

      <MetricCard
        title="SQS Queues"
        value={stats.sqs.totalQueues.toString()}
        subtitle={serviceAvailability.sqs
          ? `${stats.sqs.totalVisibleMessages} mensagens`
          : "Serviço indisponível"
        }
        icon={MessageSquare}
        color="green"
        onClick={() => handleCardClick('queue')}
        className="cursor-pointer hover:shadow-lg transition-shadow"
      />

      <MetricCard
        title="Lambda Functions"
        value={stats.lambda.totalFunctions.toString()}
        subtitle={serviceAvailability.lambda
          ? formatBytes(stats.lambda.totalSize)
          : "Serviço indisponível"
        }
        icon={Zap}
        color="yellow"
        onClick={() => handleCardClick('lambda')}
        className="cursor-pointer hover:shadow-lg transition-shadow"
      />

      <MetricCard
        title="CloudWatch Logs"
        value={stats.logs.totalGroups.toString()}
        subtitle={serviceAvailability.logs
          ? formatBytes(stats.logs.totalStoredBytes)
          : "Serviço indisponível"
        }
        icon={FileText}
        color="purple"
        onClick={() => handleCardClick('logs')}
        className="cursor-pointer hover:shadow-lg transition-shadow"
      />
    </div>
  );
}