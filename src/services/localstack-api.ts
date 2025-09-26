// LocalStack service using REST API endpoints (no CORS issues)

import type {
  TableInfo,
  QueueInfo,
  ServiceStats,
  DynamoDBListTablesResponse,
  DynamoDBTableDescription,
  SQSListQueuesResponse,
  SQSQueueAttributes,
  LambdaFunction,
  LambdaListFunctionsResponse,
  LambdaGetFunctionResponse,
  LambdaInvocationResponse,
  LogGroup,
  CloudWatchMetrics
} from '../types';
import { API_BASE_URL, TEST_LOCALSTACK_URL } from '../utils';

export class LocalStackApiService {
  private static baseUrl = API_BASE_URL;

  // Check individual service availability
  static async isDynamoDBAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/tables`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isSQSAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queues`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isLambdaAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/lambda/functions`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isCloudWatchLogsAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/logs/groups`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Test connectivity
  static async testConnection(): Promise<{ apiServer: boolean; localStack: boolean }> {
    try {
      const response = await fetch(TEST_LOCALSTACK_URL);
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
    const results = await Promise.allSettled([
      this.getDynamoDBStats(),
      this.getSQSStats(),
      this.getLambdaStats(),
      this.getCloudWatchLogsStats()
    ]);

    const dynamodbStats = results[0].status === 'fulfilled'
      ? results[0].value
      : { tables: [], totalTables: 0, totalItems: 0 };

    const sqsStats = results[1].status === 'fulfilled'
      ? results[1].value
      : { queues: [], totalQueues: 0, totalVisibleMessages: 0, totalNotVisibleMessages: 0 };

    const lambdaStats = results[2].status === 'fulfilled'
      ? results[2].value
      : { functions: [], totalFunctions: 0, totalSize: 0 };

    const logsStats = results[3].status === 'fulfilled'
      ? results[3].value
      : { logGroups: [], totalGroups: 0, totalStoredBytes: 0 };

    // Consider connected if at least one service is working
    const connectedServices = results.filter(result => result.status === 'fulfilled').length;
    const connected = connectedServices > 0;

    return {
      dynamodb: dynamodbStats,
      sqs: sqsStats,
      lambda: lambdaStats,
      logs: logsStats,
      connected,
      lastUpdated: new Date()
    };
  }

  // DynamoDB operations
  static async getDynamoDBStats() {
    try {
      // List tables
      const listResponse = await fetch(`${this.baseUrl}/dynamodb/tables`);
      if (!listResponse.ok) {
        if (listResponse.status === 500) {
          throw new Error('Serviço DynamoDB indisponível');
        }
        throw new Error(`Erro ao acessar tabelas DynamoDB: ${listResponse.status}`);
      }

      const listData: DynamoDBListTablesResponse = await listResponse.json();
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

          const describeData: DynamoDBTableDescription = await describeResponse.json();
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
      throw error;
    }
  }

  // SQS operations
  static async getSQSStats() {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queues`);
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(`Erro ao acessar filas SQS: ${response.status}`);
      }

      const data: SQSListQueuesResponse = await response.json();
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

          const attrData: SQSQueueAttributes = await attrResponse.json();
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
      throw error;
    }
  }

  // Lambda operations
  static async getLambdaStats() {
    try {
      const response = await fetch(`${this.baseUrl}/lambda/functions`);
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço Lambda indisponível');
        }
        throw new Error(`Erro ao acessar funções Lambda: ${response.status}`);
      }

      const data: LambdaListFunctionsResponse = await response.json();
      const functions = data.Functions || [];

      const lambdaFunctions: LambdaFunction[] = functions;

      const totalSize = lambdaFunctions.reduce((sum, func) => sum + func.CodeSize, 0);

      return {
        functions: lambdaFunctions,
        totalFunctions: functions.length,
        totalSize
      };
    } catch (error) {
      console.error('Failed to get Lambda stats:', error);
      throw error;
    }
  }

  // Get Lambda function details
  static async getLambdaFunction(functionName: string): Promise<LambdaGetFunctionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/lambda/function/${functionName}`);
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço Lambda indisponível');
        }
        throw new Error(`Erro ao acessar função Lambda: ${response.status}`);
      }

      const data: LambdaGetFunctionResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get Lambda function ${functionName}:`, error);
      throw error;
    }
  }

  // Invoke Lambda function
  static async invokeLambdaFunction(functionName: string, payload: string): Promise<LambdaInvocationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/lambda/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName,
          payload
        }),
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço Lambda indisponível');
        }
        throw new Error(`Erro ao invocar função Lambda: ${response.status}`);
      }

      const data: LambdaInvocationResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to invoke Lambda function ${functionName}:`, error);
      throw error;
    }
  }

  // Get Lambda metrics from CloudWatch
  static async getLambdaMetrics(functionName: string, timeRange: { start?: string; end?: string; period?: string } = {}): Promise<CloudWatchMetrics> {
    try {
      const params = new URLSearchParams();
      if (timeRange.start) params.append('startTime', timeRange.start);
      if (timeRange.end) params.append('endTime', timeRange.end);
      if (timeRange.period) params.append('period', timeRange.period);

      const response = await fetch(`${this.baseUrl}/cloudwatch/metrics/${functionName}?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço CloudWatch indisponível');
        }
        throw new Error(`Erro ao acessar métricas Lambda: ${response.status}`);
      }

      const data: CloudWatchMetrics = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get Lambda metrics for ${functionName}:`, error);
      throw error;
    }
  }

  // Get Lambda execution insights
  static async getLambdaInsights(functionName: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/cloudwatch/insights/${functionName}`);
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço CloudWatch indisponível');
        }
        throw new Error(`Erro ao acessar insights Lambda: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get Lambda insights for ${functionName}:`, error);
      throw error;
    }
  }

  // CloudWatch Logs operations
  static async getCloudWatchLogsStats() {
    try {
      const response = await fetch(`${this.baseUrl}/logs/groups`);
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço CloudWatch Logs indisponível');
        }
        throw new Error(`Erro ao acessar logs CloudWatch: ${response.status}`);
      }

      const data = await response.json();
      const logGroups = data.logGroups || [];

      const groups: LogGroup[] = logGroups.map((group: { logGroupName: string; creationTime: number; metricFilterCount?: number; storedBytes?: number }) => ({
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
      throw error;
    }
  }

  // Scan table data
  static async scanTable(tableName: string, limit: number = 50): Promise<Record<string, unknown>[]> {
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

  // Get SQS messages
  static async getSQSMessages(queueUrl: string, maxMessages: number = 10): Promise<{ MessageId: string; ReceiptHandle: string; Body: string; Attributes?: Record<string, string> }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/receive-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueUrl,
          maxNumberOfMessages: maxMessages,
          waitTimeSeconds: 0, // No long polling for immediate response
          visibilityTimeout: 30
        }),
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(`Erro ao buscar mensagens SQS: ${response.status}`);
      }

      const data = await response.json();
      return data.Messages || [];
    } catch (error) {
      console.error(`Failed to get SQS messages for ${queueUrl}:`, error);
      throw error;
    }
  }


  // Delete SQS message
  static async deleteSQSMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/delete-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueUrl,
          receiptHandle
        }),
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(`Erro ao deletar mensagem SQS: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to delete SQS message:`, error);
      throw error;
    }
  }

  // Send SQS message
  static async sendSQSMessage(queueUrl: string, messageBody: string, attributes?: Record<string, string>): Promise<void> {
    try {
      const payload: { 
        queueUrl: string; 
        messageBody: string; 
        messageAttributes: Record<string, string>; 
        messageGroupId?: string; 
        messageDeduplicationId?: string; 
      } = {
        queueUrl,
        messageBody,
        messageAttributes: attributes || {}
      };

      // Check if it's a FIFO queue and add required parameters
      if (queueUrl.endsWith('.fifo')) {
        payload.messageGroupId = 'default-group';
        payload.messageDeduplicationId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      }

      const response = await fetch(`${this.baseUrl}/sqs/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(`Erro ao enviar mensagem SQS: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to send SQS message:`, error);
      throw error;
    }
  }

  // Get recent log events
  static async getLogEvents(logGroupName: string): Promise<{ timestamp: number; message: string; ingestionTime?: number }[]> {
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