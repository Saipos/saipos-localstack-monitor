// LocalStack service using REST API endpoints (no CORS issues)

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
  attributes: Record<string, any>;
}

export interface LambdaFunction {
  functionName: string;
  runtime: string;
  lastModified: string;
  state: string;
  codeSize: number;
}

export interface LogGroup {
  logGroupName: string;
  creationTime: number;
  metricFilterCount: number;
  storedBytes: number;
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

export class LocalStackApiService {
  private static baseUrl = 'http://localhost:3002/api';

  // Test connectivity
  static async testConnection(): Promise<{ apiServer: boolean; localStack: boolean }> {
    try {
      const response = await fetch('http://localhost:3002/test-localstack');
      const data = await response.json();

      return {
        apiServer: response.ok,
        localStack: data.connected
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { apiServer: false, localStack: false };
    }
  }

  // Get all service statistics
  static async getServiceStats(): Promise<ServiceStats> {
    try {
      const [dynamodbStats, sqsStats, lambdaStats, logsStats] = await Promise.all([
        this.getDynamoDBStats(),
        this.getSQSStats(),
        this.getLambdaStats(),
        this.getCloudWatchLogsStats()
      ]);

      return {
        dynamodb: dynamodbStats,
        sqs: sqsStats,
        lambda: lambdaStats,
        logs: logsStats,
        connected: true,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Failed to get service stats:', error);

      return {
        dynamodb: { tables: [], totalTables: 0, totalItems: 0 },
        sqs: { queues: [], totalQueues: 0, totalVisibleMessages: 0, totalNotVisibleMessages: 0 },
        lambda: { functions: [], totalFunctions: 0, totalSize: 0 },
        logs: { logGroups: [], totalGroups: 0, totalStoredBytes: 0 },
        connected: false,
        lastUpdated: new Date()
      };
    }
  }

  // DynamoDB operations
  static async getDynamoDBStats() {
    try {
      // List tables
      const listResponse = await fetch(`${this.baseUrl}/dynamodb/tables`);
      if (!listResponse.ok) {
        throw new Error(`Failed to list tables: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const tableNames = listData.TableNames || [];

      // Get details for each table
      const tables: TableInfo[] = [];
      let totalItems = 0;

      for (const tableName of tableNames) {
        try {
          const describeResponse = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}`);

          if (!describeResponse.ok) {
            console.warn(`Failed to describe table ${tableName}`);
            tables.push({
              name: tableName,
              itemCount: 0,
              sizeBytes: 0
            });
            continue;
          }

          const describeData = await describeResponse.json();
          const table = describeData.Table;

          const tableInfo: TableInfo = {
            name: tableName,
            itemCount: table?.ItemCount || 0,
            sizeBytes: table?.TableSizeBytes || 0,
            creationDateTime: table?.CreationDateTime
          };

          tables.push(tableInfo);
          totalItems += tableInfo.itemCount;

          console.log(`Table ${tableName}:`, tableInfo);
        } catch (error) {
          console.warn(`Failed to describe table ${tableName}:`, error);
          tables.push({
            name: tableName,
            itemCount: 0,
            sizeBytes: 0
          });
        }
      }

      return {
        tables,
        totalTables: tableNames.length,
        totalItems
      };
    } catch (error) {
      console.error('Failed to get DynamoDB stats:', error);
      return { tables: [], totalTables: 0, totalItems: 0 };
    }
  }

  // SQS operations
  static async getSQSStats() {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queues`);
      if (!response.ok) {
        throw new Error(`Failed to list queues: ${response.status}`);
      }

      const data = await response.json();
      const queueUrls = data.QueueUrls || [];

      const queues: QueueInfo[] = [];
      let totalVisible = 0;
      let totalNotVisible = 0;

      for (const queueUrl of queueUrls) {
        try {
          const queueName = queueUrl.split('/').pop() || 'unknown';

          const attrResponse = await fetch(`${this.baseUrl}/sqs/queue-attributes?queueUrl=${encodeURIComponent(queueUrl)}`);

          if (!attrResponse.ok) {
            console.warn(`Failed to get attributes for queue ${queueUrl}`);
            continue;
          }

          const attrData = await attrResponse.json();
          const attributes = attrData.Attributes || {};

          const visibleMessages = parseInt(attributes.ApproximateNumberOfMessages || '0');
          const notVisibleMessages = parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0');

          queues.push({
            url: queueUrl,
            name: queueName,
            visibleMessages,
            notVisibleMessages,
            attributes
          });

          totalVisible += visibleMessages;
          totalNotVisible += notVisibleMessages;
        } catch (error) {
          console.warn(`Failed to get queue attributes for ${queueUrl}:`, error);
        }
      }

      return {
        queues,
        totalQueues: queueUrls.length,
        totalVisibleMessages: totalVisible,
        totalNotVisibleMessages: totalNotVisible
      };
    } catch (error) {
      console.error('Failed to get SQS stats:', error);
      return { queues: [], totalQueues: 0, totalVisibleMessages: 0, totalNotVisibleMessages: 0 };
    }
  }

  // Lambda operations
  static async getLambdaStats() {
    try {
      const response = await fetch(`${this.baseUrl}/lambda/functions`);
      if (!response.ok) {
        throw new Error(`Failed to list functions: ${response.status}`);
      }

      const data = await response.json();
      const functions = data.Functions || [];

      const lambdaFunctions: LambdaFunction[] = functions.map((func: any) => ({
        functionName: func.FunctionName,
        runtime: func.Runtime,
        lastModified: func.LastModified,
        state: func.State,
        codeSize: func.CodeSize
      }));

      const totalSize = lambdaFunctions.reduce((sum, func) => sum + func.codeSize, 0);

      return {
        functions: lambdaFunctions,
        totalFunctions: functions.length,
        totalSize
      };
    } catch (error) {
      console.error('Failed to get Lambda stats:', error);
      return { functions: [], totalFunctions: 0, totalSize: 0 };
    }
  }

  // CloudWatch Logs operations
  static async getCloudWatchLogsStats() {
    try {
      const response = await fetch(`${this.baseUrl}/logs/groups`);
      if (!response.ok) {
        throw new Error(`Failed to list log groups: ${response.status}`);
      }

      const data = await response.json();
      const logGroups = data.logGroups || [];

      const groups: LogGroup[] = logGroups.map((group: any) => ({
        logGroupName: group.logGroupName,
        creationTime: group.creationTime,
        metricFilterCount: group.metricFilterCount || 0,
        storedBytes: group.storedBytes || 0
      }));

      const totalStoredBytes = groups.reduce((sum, group) => sum + group.storedBytes, 0);

      return {
        logGroups: groups,
        totalGroups: logGroups.length,
        totalStoredBytes
      };
    } catch (error) {
      console.error('Failed to get CloudWatch Logs stats:', error);
      return { logGroups: [], totalGroups: 0, totalStoredBytes: 0 };
    }
  }

  // Scan table data
  static async scanTable(tableName: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}/scan?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to scan table: ${response.status}`);
      }

      const data = await response.json();
      return data.Items || [];
    } catch (error) {
      console.error(`Failed to scan table ${tableName}:`, error);
      return [];
    }
  }

  // Get recent log events
  static async getLogEvents(logGroupName: string, limit: number = 50): Promise<any[]> {
    try {
      // First get log streams
      const streamsResponse = await fetch(`${this.baseUrl}/logs/streams?logGroupName=${encodeURIComponent(logGroupName)}`);
      if (!streamsResponse.ok) {
        throw new Error(`Failed to list streams: ${streamsResponse.status}`);
      }

      const streamsData = await streamsResponse.json();
      const streams = streamsData.logStreams || [];

      if (streams.length === 0) return [];

      // Get events from the most recent stream
      const mostRecentStream = streams[0];
      const eventsResponse = await fetch(`${this.baseUrl}/logs/events?logGroupName=${encodeURIComponent(logGroupName)}&logStreamName=${encodeURIComponent(mostRecentStream.logStreamName)}`);

      if (!eventsResponse.ok) {
        throw new Error(`Failed to get events: ${eventsResponse.status}`);
      }

      const eventsData = await eventsResponse.json();
      return eventsData.events || [];
    } catch (error) {
      console.error(`Failed to get log events for ${logGroupName}:`, error);
      return [];
    }
  }
}