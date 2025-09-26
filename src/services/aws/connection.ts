// Connection and health check service for LocalStack API
import { TEST_LOCALSTACK_URL } from '../../constants';
import { BaseAWSService } from './base';
import { DynamoDBService } from './dynamodb';
import { SQSService } from './sqs';
import { LambdaService } from './lambda';
import { CloudWatchService } from './cloudwatch';
import type { ServiceStats } from '../../types';

export class ConnectionService extends BaseAWSService {
  /**
   * Test overall connectivity to LocalStack
   */
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

  /**
   * Get comprehensive statistics from all services
   */
  static async getServiceStats(): Promise<ServiceStats> {
    const results = await Promise.allSettled([
      DynamoDBService.getStats(),
      SQSService.getStats(),
      LambdaService.getStats(),
      CloudWatchService.getStats()
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

  /**
   * Check availability of individual services
   */
  static async checkServiceAvailability() {
    const [dynamodb, sqs, lambda, logs] = await Promise.all([
      DynamoDBService.isAvailable(),
      SQSService.isAvailable(),
      LambdaService.isAvailable(),
      CloudWatchService.isAvailable()
    ]);

    return { dynamodb, sqs, lambda, logs };
  }
}