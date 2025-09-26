// Analytics Platform Token
export interface AnalyticsPlatformToken {
  idPlatformToken: string;
  idStore: number;
  idStoreSiteData: number;
  platform: 'meta' | 'google' | 'tiktok';
  tokenEncrypted: string;
  tokenLast6Digits: string;
  pixelId: string;
  idUser: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Analytics Event
export interface AnalyticsEvent {
  event: string;
  value: {
    content_type: string;
    content_ids: number[];
    value: number;
    currency: string;
    contents: Array<{
      id: string;
      quantity: number;
      item_price: number;
    }>;
  };
}

// SQS Queue Stats
export interface QueueStats {
  visibleMessages: number;
  notVisibleMessages: number;
  totalMessages: number;
  lastUpdated: Date;
}

// Lambda Log Event
export interface LambdaLogEvent {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalTokens: number;
  activeTokens: number;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  processingRate: number;
}

// Event Test Configuration
export interface EventTestConfig {
  eventType: 'AddToCart' | 'Purchase' | 'PageView';
  storeId: number;
  numberOfEvents: number;
  intervalMs: number;
}

// Re-export AWS API types
export * from '../api/aws-api';

// Import types needed for local interfaces
import type { LambdaFunction, LogGroup } from '../api/aws-api';

// LocalStack Service Types (moved from localstack-api.ts)
export interface TableInfo {
  name: string;
  itemCount: number;
  sizeBytes: number;
  creationDateTime?: string;
}

export interface QueueInfo {
  url: string;
  name: string;
  visibleMessages: number;
  notVisibleMessages: number;
  attributes: Record<string, unknown>;
}

export interface ServiceStats {
  dynamodb: {
    tables: TableInfo[];
    totalTables: number;
    totalItems: number;
  };
  sqs: {
    queues: QueueInfo[];
    totalQueues: number;
    totalVisibleMessages: number;
    totalNotVisibleMessages: number;
  };
  lambda: {
    functions: LambdaFunction[];
    totalFunctions: number;
    totalSize: number;
  };
  logs: {
    logGroups: LogGroup[];
    totalGroups: number;
    totalStoredBytes: number;
  };
  connected: boolean;
  lastUpdated: Date;
}

// Service connectivity types
export interface ServiceConnectionStatus {
  apiServer: boolean;
  localStack: boolean;
}

// Individual service availability
export interface ServiceAvailability {
  dynamodb: boolean;
  sqs: boolean;
  lambda: boolean;
  logs: boolean;
}

// Refresh configuration types
export interface RefreshIntervalOption {
  value: number;
  label: string;
}

export const REFRESH_INTERVALS: RefreshIntervalOption[] = [
  { value: 5000, label: '5 segundos' },
  { value: 10000, label: '10 segundos' },
  { value: 20000, label: '20 segundos' },
  { value: 30000, label: '30 segundos' },
  { value: 60000, label: '1 minuto' },
] as const;

// Connection status types - consolidated
export type ConnectionState = 'connected' | 'disconnected' | 'checking' | 'error';

// Alias for backward compatibility
export type ConnectionStatusType = ConnectionState;

export type ChartColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';

export interface MetricDataPointForChart {
  timestamp: string;
  value: number;
}