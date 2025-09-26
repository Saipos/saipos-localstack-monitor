// Types exatos baseados nas responses reais das APIs LocalStack

// Namespace para organizar tipos AWS de forma hierárquica
// DynamoDB Types
export interface DynamoDBListTablesResponse {
  TableNames: string[];
}

export interface DynamoDBTableDescription {
  Table: {
    TableName: string;
    ItemCount: number;
    TableSizeBytes: number;
    CreationDateTime: string;
    TableStatus: string;
    KeySchema: Array<{
      AttributeName: string;
      KeyType: 'HASH' | 'RANGE';
    }>;
    AttributeDefinitions: Array<{
      AttributeName: string;
      AttributeType: 'S' | 'N' | 'B';
    }>;
  };
}

export interface DynamoDBScanResponse {
  Items: Record<string, unknown>[];
  Count: number;
  ScannedCount: number;
  LastEvaluatedKey?: Record<string, unknown>;
}

// SQS Types
export interface SQSListQueuesResponse {
  QueueUrls: string[];
}

export interface SQSQueueAttributes {
  Attributes: {
    ApproximateNumberOfMessages: string;
    ApproximateNumberOfMessagesNotVisible: string;
    ApproximateNumberOfMessagesDelayed?: string;
    CreatedTimestamp: string;
    LastModifiedTimestamp: string;
    QueueArn: string;
    ReceiveMessageWaitTimeSeconds: string;
    VisibilityTimeoutSeconds: string;
    MessageRetentionPeriod: string;
    MaxReceiveCount?: string;
  };
}

export interface SQSMessage {
  MessageId: string;
  ReceiptHandle: string;
  MD5OfBody: string;
  Body: string;
  MessageAttributes?: Record<string, {
    StringValue?: string;
    BinaryValue?: string;
    DataType: string;
  }>;
  Attributes?: Record<string, string>;
}

export interface SQSReceiveMessageResponse {
  Messages: SQSMessage[];
}

export interface SQSSendMessageResponse {
  MessageId: string;
  MD5OfMessageBody: string;
  MD5OfMessageAttributes?: string;
  SequenceNumber?: string;
}

// Lambda Types
export interface LambdaEnvironment {
  Variables: Record<string, string>;
}

export interface LambdaTracingConfig {
  Mode: 'Active' | 'PassThrough';
}

export interface LambdaFunction {
  FunctionName: string;
  FunctionArn: string;
  Runtime: string;
  Role: string;
  Handler: string;
  CodeSize: number;
  Description: string;
  Timeout: number;
  MemorySize: number;
  LastModified: string;
  CodeSha256: string;
  Version: string;
  Environment: LambdaEnvironment;
  TracingConfig: LambdaTracingConfig;
  RevisionId: string;
  State?: string;
}

export interface LambdaListFunctionsResponse {
  Functions: LambdaFunction[];
}

export interface LambdaGetFunctionResponse {
  Configuration: LambdaFunction;
  Code: {
    RepositoryType: string;
    Location: string;
  };
  Tags: Record<string, string>;
}

export interface LambdaInvocationResponse {
  StatusCode: number;
  ExecutedVersion?: string;
  Payload?: string;
  ResponsePayload?: string;
  LogResult?: string;
  ExecutionDuration?: number;
  BilledDuration?: number;
  MemoryUsed?: number;
}

// CloudWatch Types
export interface LogGroup {
  logGroupName: string;
  creationTime: number;
  metricFilterCount: number;
  arn: string;
  storedBytes: number;
  retentionInDays?: number;
}

export interface LogGroupsResponse {
  logGroups: LogGroup[];
}

export interface LogStream {
  logStreamName: string;
  creationTime: number;
  firstEventTime: number;
  lastEventTime: number;
  lastIngestionTime: number;
  uploadSequenceToken: string;
  arn: string;
  storedBytes: number;
}

export interface LogStreamsResponse {
  logStreams: LogStream[];
}

export interface LogEvent {
  timestamp: number;
  message: string;
  ingestionTime?: number;
}

export interface LogEventsResponse {
  events: LogEvent[];
  nextForwardToken?: string;
  nextBackwardToken?: string;
}

// CloudWatch Metrics Types
export interface MetricDataPoint {
  Timestamp: string;
  Value?: number;
  Sum?: number;
  Average?: number;
  Maximum?: number;
  Minimum?: number;
  Unit?: string;
}

export interface CloudWatchMetrics {
  Invocations: MetricDataPoint[];
  Duration: MetricDataPoint[];
  Errors: MetricDataPoint[];
  Throttles: MetricDataPoint[];
  ConcurrentExecutions: MetricDataPoint[];
}

export interface CloudWatchInsightsField {
  field: string;
  value: string;
}

export interface CloudWatchInsightsResult {
  fields: CloudWatchInsightsField[];
}

export interface CloudWatchInsights {
  results: CloudWatchInsightsResult[];
  statistics?: {
    recordsMatched: number;
    recordsScanned: number;
    bytesScanned: number;
  };
  status: 'Scheduled' | 'Running' | 'Complete' | 'Failed' | 'Cancelled';
}