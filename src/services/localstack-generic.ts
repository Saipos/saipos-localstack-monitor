// Generic LocalStack service for basic project mode

interface TableInfo {
  name: string;
  itemCount: number;
  sizeBytes: number;
  creationDateTime?: string;
}

interface QueueInfo {
  url: string;
  name: string;
  visibleMessages: number;
  notVisibleMessages: number;
  attributes: Record<string, any>;
}

interface LambdaFunction {
  functionName: string;
  runtime: string;
  lastModified: string;
  state: string;
  codeSize: number;
}

interface LogGroup {
  logGroupName: string;
  creationTime: number;
  metricFilterCount: number;
  storedBytes: number;
}

interface ServiceStats {
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

export class LocalStackGenericService {
  private static baseUrl = '/aws';
  private static apiServerUrl = 'http://localhost:3002';

  // Test connectivity to both API server and LocalStack
  static async testConnection(): Promise<{ apiServer: boolean; localStack: boolean }> {
    try {
      // Test API server
      const apiResponse = await fetch(`${this.apiServerUrl}/health`);
      const apiConnected = apiResponse.ok;

      // Test LocalStack through API server
      const localStackResponse = await fetch(`${this.apiServerUrl}/test-localstack`);
      const localStackData = await localStackResponse.json();

      return {
        apiServer: apiConnected,
        localStack: localStackData.connected
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { apiServer: false, localStack: false };
    }
  }

  // Get all LocalStack service statistics
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

      // Return empty stats if connection fails
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
      const listResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          'X-Amz-Target': 'DynamoDB_20120810.ListTables',
        },
        body: JSON.stringify({})
      });

      console.log('ListTables response status:', listResponse.status);

      if (!listResponse.ok) {
        throw new Error(`ListTables failed: ${listResponse.status} ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      console.log('ListTables data:', listData);
      const tableNames = listData.TableNames || [];

      // Get details for each table
      const tables: TableInfo[] = [];
      let totalItems = 0;

      for (const tableName of tableNames) {
        try {
          const describeResponse = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-amz-json-1.0',
              'X-Amz-Target': 'DynamoDB_20120810.DescribeTable',
            },
            body: JSON.stringify({ TableName: tableName })
          });

          console.log(`DescribeTable ${tableName} response status:`, describeResponse.status);

          if (!describeResponse.ok) {
            console.warn(`DescribeTable failed for ${tableName}:`, describeResponse.status, describeResponse.statusText);
            throw new Error(`DescribeTable failed: ${describeResponse.status}`);
          }

          const describeData = await describeResponse.json();
          console.log(`DescribeTable ${tableName} data:`, describeData);
          const table = describeData.Table;

          const tableInfo: TableInfo = {
            name: tableName,
            itemCount: table?.ItemCount || 0,
            sizeBytes: table?.TableSizeBytes || 0,
            creationDateTime: table?.CreationDateTime
          };

          tables.push(tableInfo);
          totalItems += tableInfo.itemCount;
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
      const response = await fetch(`${this.baseUrl}/?Action=ListQueues&Version=2012-11-05`);
      const text = await response.text();

      // Parse XML response
      const urls = text.match(/<QueueUrl>(.*?)<\/QueueUrl>/g) || [];
      const queueUrls = urls.map(url => url.replace(/<\/?QueueUrl>/g, ''));

      const queues: QueueInfo[] = [];
      let totalVisible = 0;
      let totalNotVisible = 0;

      for (const queueUrl of queueUrls) {
        try {
          const queueName = queueUrl.split('/').pop() || 'unknown';

          const params = new URLSearchParams({
            Action: 'GetQueueAttributes',
            Version: '2012-11-05',
            QueueUrl: queueUrl,
            'AttributeName.1': 'All'
          });

          const attrResponse = await fetch(`${this.baseUrl}/?${params}`);
          const attrText = await attrResponse.text();

          // Parse attributes from XML
          const visibleMatch = attrText.match(/<Name>ApproximateNumberOfMessages<\/Name>\s*<Value>(\d+)<\/Value>/);
          const notVisibleMatch = attrText.match(/<Name>ApproximateNumberOfMessagesNotVisible<\/Name>\s*<Value>(\d+)<\/Value>/);

          const visibleMessages = visibleMatch ? parseInt(visibleMatch[1]) : 0;
          const notVisibleMessages = notVisibleMatch ? parseInt(notVisibleMatch[1]) : 0;

          queues.push({
            url: queueUrl,
            name: queueName,
            visibleMessages,
            notVisibleMessages,
            attributes: {}
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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSLambda.ListFunctions',
        },
        body: JSON.stringify({})
      });

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
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Logs_20140328.DescribeLogGroups',
        },
        body: JSON.stringify({})
      });

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

  // Scan table data (generic)
  static async scanTable(tableName: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          'X-Amz-Target': 'DynamoDB_20120810.Scan',
        },
        body: JSON.stringify({
          TableName: tableName,
          Limit: limit
        })
      });

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
      const streamsResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Logs_20140328.DescribeLogStreams',
        },
        body: JSON.stringify({
          logGroupName,
          orderBy: 'LastEventTime',
          descending: true,
          limit: 5
        })
      });

      const streamsData = await streamsResponse.json();
      const streams = streamsData.logStreams || [];

      if (streams.length === 0) return [];

      // Get events from the most recent stream
      const mostRecentStream = streams[0];
      const eventsResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'Logs_20140328.GetLogEvents',
        },
        body: JSON.stringify({
          logGroupName,
          logStreamName: mostRecentStream.logStreamName,
          limit,
          startFromHead: false
        })
      });

      const eventsData = await eventsResponse.json();
      return eventsData.events || [];
    } catch (error) {
      console.error(`Failed to get log events for ${logGroupName}:`, error);
      return [];
    }
  }
}