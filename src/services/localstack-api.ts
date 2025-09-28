import type {
  CloudWatchMetrics,
  DynamoDBListTablesResponse,
  DynamoDBTableDescription,
  LambdaFunction,
  LambdaGetFunctionResponse,
  LambdaInvocationResponse,
  LambdaListFunctionsResponse,
  LogGroup,
  QueueInfo,
  ServiceStats,
  SQSDeleteMessageResponse,
  SQSListQueuesResponse,
  SQSMessage,
  SQSQueueAttributes,
  SQSReceiveMessageFilteredResponse,
  TableInfo
} from '../types';
import { API_BASE_URL, TEST_LOCALSTACK_URL } from '../utils';

export class LocalStackApiService {
  private static baseUrl = API_BASE_URL;

  // Check individual service availability
  static async isDynamoDBAvailable(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/tables`, { signal });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isSQSAvailable(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queues`, { signal });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isLambdaAvailable(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/lambda/functions`, { signal });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async isCloudWatchLogsAvailable(signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/logs/groups`, { signal });
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
  static async getDynamoDBStats(signal?: AbortSignal) {
    try {
      // List tables
      const listResponse = await fetch(`${this.baseUrl}/dynamodb/tables`, { signal });
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
          const describeResponse = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}`, { signal });

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
  static async getSQSStats(signal?: AbortSignal) {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queues`, { signal });
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

          const attrResponse = await fetch(`${this.baseUrl}/sqs/queue-attributes?queueUrl=${encodeURIComponent(queueUrl)}`, { signal });

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
  static async scanTable(tableName: string, limit: number = 50, signal?: AbortSignal): Promise<Record<string, unknown>[]> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}/scan?limit=${limit}`, { signal });
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
  static async getSQSMessages(queueUrl: string, maxMessages: number = 10, signal?: AbortSignal): Promise<{ MessageId: string; ReceiptHandle: string; Body: string; Attributes?: Record<string, string> }[]> {
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
        signal
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

  // Get detailed table information (describe-table)
  static async getTableDetails(tableName: string, signal?: AbortSignal): Promise<DynamoDBTableDescription> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}`, { signal });
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço DynamoDB indisponível');
        }
        throw new Error(`Erro ao obter detalhes da tabela: ${response.status}`);
      }
      const data: DynamoDBTableDescription = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get table details for ${tableName}:`, error);
      throw error;
    }
  }

  // Create item in DynamoDB table
  static async createTableItem(tableName: string, item: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}/item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500) {
          throw new Error('Serviço DynamoDB indisponível');
        }
        throw new Error(errorData.error || `Erro ao criar item na tabela: ${response.status}`);
      }

      const result = await response.json();
      console.log('Item created successfully:', result);
    } catch (error) {
      console.error(`Failed to create item in table ${tableName}:`, error);
      throw error;
    }
  }

  // Delete item from DynamoDB table
  static async deleteTableItem(tableName: string, key: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}/item`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500) {
          throw new Error('Serviço DynamoDB indisponível');
        }
        throw new Error(errorData.error || `Erro ao deletar item da tabela: ${response.status}`);
      }

      const result = await response.json();
      console.log('Item deleted successfully:', result);
    } catch (error) {
      console.error(`Failed to delete item from table ${tableName}:`, error);
      throw error;
    }
  }

  // Update item in DynamoDB table
  static async updateTableItem(tableName: string, item: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/dynamodb/table/${tableName}/item`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500) {
          throw new Error('Serviço DynamoDB indisponível');
        }
        throw new Error(errorData.error || `Erro ao atualizar item da tabela: ${response.status}`);
      }

      const result = await response.json();
      console.log('Item updated successfully:', result);
    } catch (error) {
      console.error(`Failed to update item in table ${tableName}:`, error);
      throw error;
    }
  }

  // Get queue details including FIFO status and max receive count
  static async getQueueDetails(queueName: string, signal?: AbortSignal): Promise<{
    queueName: string;
    queueUrl: string;
    isFifoQueue: boolean;
    maxReceiveCount: number;
    attributes: Record<string, string>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queue/${queueName}/details`, { signal });
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(`Erro ao obter detalhes da fila: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get queue details for ${queueName}:`, error);
      throw error;
    }
  }

  // Enhanced SQS message retrieval with different visibility modes
  static async getSQSMessagesFiltered(queueUrl: string, mode: 'available' | 'dlq' = 'available', signal?: AbortSignal): Promise<SQSReceiveMessageFilteredResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/receive-messages-filtered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queueUrl,
          mode,
          maxNumberOfMessages: 10
        }),
        signal
      });

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(`Erro ao obter mensagens SQS: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to get SQS messages (${mode} mode):`, error);
      throw error;
    }
  }

  // Delete SQS message
  static async deleteSQSMessage(queueUrl: string, receiptHandle: string, signal?: AbortSignal): Promise<SQSDeleteMessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/delete-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queueUrl,
          receiptHandle
        }),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to delete SQS message:', error);
      throw error;
    }
  }



  // Enhanced create SQS message for MessageCreator
  static async createSQSMessage(queueName: string, messageData: {
    body: string;
    attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
    delaySeconds?: number;
    messageGroupId?: string;
    messageDeduplicationId?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sqs/queue/${queueName}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(errorData.error || `Erro ao criar mensagem na fila: ${response.status}`);
      }

      const result = await response.json();
      console.log('Message created successfully:', result);
    } catch (error) {
      console.error(`Failed to create message in queue ${queueName}:`, error);
      throw error;
    }
  }

  // Update SQS message (delete old and send new)
  static async updateSQSMessage(queueName: string, receiptHandle: string, messageData: {
    body: string;
    attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
  }, originalMessage?: SQSMessage): Promise<void> {
    try {
      const payload: {
        receiptHandle: string;
        body: string;
        attributes?: Record<string, { StringValue?: string; BinaryValue?: string; DataType: string }>;
        messageGroupId?: string;
        messageDeduplicationId?: string;
      } = {
        receiptHandle,
        ...messageData
      };

      // If this is a FIFO queue, add the required FIFO parameters
      if (queueName.endsWith('.fifo') && originalMessage) {
        // Extract MessageGroupId from original message attributes
        const messageGroupId = originalMessage.Attributes?.MessageGroupId;
        if (messageGroupId) {
          payload.messageGroupId = messageGroupId;
        }

        // Extract MessageDeduplicationId from original message if available
        const messageDeduplicationId = originalMessage.Attributes?.MessageDeduplicationId;
        if (messageDeduplicationId) {
          payload.messageDeduplicationId = messageDeduplicationId;
        }
      }

      const response = await fetch(`${this.baseUrl}/sqs/queue/${queueName}/message`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 500) {
          throw new Error('Serviço SQS indisponível');
        }
        throw new Error(errorData.error || `Erro ao atualizar mensagem na fila: ${response.status}`);
      }

      const result = await response.json();
      console.log('Message updated successfully:', result);
    } catch (error) {
      console.error(`Failed to update message in queue ${queueName}:`, error);
      throw error;
    }
  }
}