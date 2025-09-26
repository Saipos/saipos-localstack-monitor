// Dashboard component types and interfaces

import type { BaseComponentProps } from './ui';
import type { AnalyticsPlatformToken } from '../domain';

// Dashboard section props
export interface ServiceMetricsSectionProps extends BaseComponentProps {
  stats: {
    totalTables: number;
    totalItems: number;
    totalQueues: number;
    totalMessages: number;
    totalFunctions: number;
    totalLogGroups: number;
  };
  onTabChange?: (tab: string) => void;
  loading?: boolean;
}

// Store and token related types
export interface StoreData {
  storeId: number;
  totalTokens: number;
  activeTokens: number;
  tokens: AnalyticsPlatformToken[];
}

export interface StoreTokensViewProps extends BaseComponentProps {
  stores?: StoreData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

// Lambda function details
export interface LambdaFunctionDetailsProps extends BaseComponentProps {
  functionName: string;
  functionData: {
    FunctionName: string;
    Runtime?: string;
    Handler?: string;
    CodeSize?: number;
    Timeout?: number;
    MemorySize?: number;
    LastModified?: string;
  };
  onClose?: () => void;
}

// Log event types for components
export interface LogEvent {
  timestamp: number;
  message: string;
  level?: 'info' | 'warn' | 'error';
  ingestionTime?: number;
}

export interface LogStream {
  logStreamName: string;
  creationTime: number;
  lastEventTimestamp: number;
  storedBytes: number;
}

// Lambda logs viewer
export interface LambdaLogsViewerProps extends BaseComponentProps {
  functionName?: string;
  autoRefresh?: boolean;
  maxEvents?: number;
  onEventClick?: (event: LogEvent) => void;
}

// Invocation result for Lambda testing
export interface InvocationResult {
  statusCode: number;
  payload: string;
  executionDuration: number;
  billedDuration: number;
  memoryUsed: number;
  logResult?: string;
}

// Debug test results
export interface DebugResult {
  test: string;
  status: 'SUCCESS' | 'FAILED' | 'ERROR';
  details: unknown;
  duration?: number;
  timestamp?: number;
}

export interface DebugTestPanelProps extends BaseComponentProps {
  onTestComplete?: (results: DebugResult[]) => void;
  autoRun?: boolean;
}

export interface TestResults {
  dynamodb: boolean | null;
  sqs: boolean | null;
  lambda?: boolean | null;
  logs: boolean | null;
}

// Dashboard component props
export interface BasicLocalStackDashboardProps extends BaseComponentProps {
  onTabChange?: (tab: string) => void;
}

// Lambda function display types
export interface LambdaFunctionDisplay {
  functionName: string;
  runtime: string;
  status: 'Active' | 'Inactive' | 'Failed';
  lastModified: string;
  memorySize?: number;
  timeout?: number;
  codeSize?: number;
}

// SQS Queue types
export interface QueueInfo {
  url: string;
  name: string;
  attributes?: {
    visibleMessages?: number;
    notVisibleMessages?: number;
    delayedMessages?: number;
  };
}

export interface QueueMetrics {
  visibleMessages: number;
  notVisibleMessages: number;
  delayedMessages: number;
  totalMessages: number;
}

export interface QueueHistoryPoint {
  timestamp: Date;
  visible: number;
  notVisible: number;
  delayed: number;
}

// DynamoDB table types for dashboard
export interface DynamoTable {
  name: string;
  itemCount: number;
  sizeBytes: number;
  creationDateTime?: string;
  status?: 'ACTIVE' | 'CREATING' | 'DELETING' | 'UPDATING';
}

// Dashboard section props
export interface LambdaSectionProps extends BaseComponentProps {
  functions: any[]; // TODO: Replace with proper LambdaFunction type
  isServiceAvailable: boolean;
  onFunctionClick?: (functionName: string) => void;
}

export interface LogsSectionProps extends BaseComponentProps {
  logGroups: any[]; // TODO: Replace with proper LogGroup type
  isServiceAvailable: boolean;
  onLogGroupClick?: (logGroup: string) => void;
}

export interface DynamoDBSectionProps extends BaseComponentProps {
  tables: any[]; // TODO: Replace with proper TableInfo type
  isServiceAvailable: boolean;
  onTableClick?: (tableName: string) => void;
}