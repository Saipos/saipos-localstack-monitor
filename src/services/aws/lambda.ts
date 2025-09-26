// Lambda service for LocalStack API
import type {
  LambdaFunction,
  LambdaListFunctionsResponse,
  LambdaGetFunctionResponse,
  LambdaInvocationResponse,
  CloudWatchMetrics
} from '../../types';
import { BaseAWSService } from './base';

export class LambdaService extends BaseAWSService {
  private static readonly SERVICE_PATH = '/lambda';

  /**
   * Check if Lambda service is available
   */
  static async isAvailable(): Promise<boolean> {
    return this.isServiceAvailable(`${this.SERVICE_PATH}/functions`);
  }

  /**
   * Get comprehensive Lambda statistics
   */
  static async getStats() {
    try {
      const data = await this.makeRequest<LambdaListFunctionsResponse>(
        `${this.SERVICE_PATH}/functions`
      );

      const functions = data.Functions || [];
      const totalSize = functions.reduce((sum, func) => sum + func.CodeSize, 0);

      return {
        functions: functions as LambdaFunction[],
        totalFunctions: functions.length,
        totalSize
      };
    } catch (error) {
      this.handleServiceError(error, 'Lambda');
    }
  }

  /**
   * Get detailed function information
   */
  static async getFunction(functionName: string): Promise<LambdaGetFunctionResponse> {
    try {
      return await this.makeRequest<LambdaGetFunctionResponse>(
        `${this.SERVICE_PATH}/function/${functionName}`
      );
    } catch (error) {
      this.handleServiceError(error, 'Lambda');
    }
  }

  /**
   * Invoke a Lambda function
   */
  static async invokeFunction(
    functionName: string,
    payload: string
  ): Promise<LambdaInvocationResponse> {
    try {
      return await this.makeRequest<LambdaInvocationResponse>(
        `${this.SERVICE_PATH}/invoke`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ functionName, payload })
        }
      );
    } catch (error) {
      this.handleServiceError(error, 'Lambda');
    }
  }

  /**
   * Get Lambda metrics from CloudWatch
   */
  static async getMetrics(
    functionName: string,
    timeRange: { start?: string; end?: string; period?: string } = {}
  ): Promise<CloudWatchMetrics> {
    try {
      const params = new URLSearchParams();
      if (timeRange.start) params.append('startTime', timeRange.start);
      if (timeRange.end) params.append('endTime', timeRange.end);
      if (timeRange.period) params.append('period', timeRange.period);

      return await this.makeRequest<CloudWatchMetrics>(
        `/cloudwatch/metrics/${functionName}?${params.toString()}`
      );
    } catch (error) {
      this.handleServiceError(error, 'CloudWatch');
    }
  }

  /**
   * Get Lambda execution insights
   */
  static async getInsights(functionName: string): Promise<Record<string, unknown>> {
    try {
      return await this.makeRequest(
        `/cloudwatch/insights/${functionName}`
      );
    } catch (error) {
      this.handleServiceError(error, 'CloudWatch');
    }
  }
}