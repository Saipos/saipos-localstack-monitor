// CloudWatch Logs service for LocalStack API
import type { LogGroup } from '../../types';
import { BaseAWSService } from './base';

export class CloudWatchService extends BaseAWSService {
  private static readonly SERVICE_PATH = '/logs';

  /**
   * Check if CloudWatch Logs service is available
   */
  static async isAvailable(): Promise<boolean> {
    return this.isServiceAvailable(`${this.SERVICE_PATH}/groups`);
  }

  /**
   * Get comprehensive CloudWatch Logs statistics
   */
  static async getStats() {
    try {
      const data = await this.makeRequest<{ logGroups: Array<{ logGroupName: string; creationTime: number; metricFilterCount?: number; arn?: string; storedBytes?: number; retentionInDays?: number }> }>(
        `${this.SERVICE_PATH}/groups`
      );

      const logGroups = data.logGroups || [];

      const groups: LogGroup[] = logGroups.map((group: { logGroupName: string; creationTime: number; metricFilterCount?: number; arn?: string; storedBytes?: number; retentionInDays?: number }) => ({
        logGroupName: group.logGroupName,
        creationTime: group.creationTime,
        metricFilterCount: group.metricFilterCount || 0,
        arn: group.arn || '',
        storedBytes: group.storedBytes || 0,
        retentionInDays: group.retentionInDays
      }));

      const totalStoredBytes = groups.reduce((sum, group) => sum + group.storedBytes, 0);

      return {
        logGroups: groups,
        totalGroups: logGroups.length,
        totalStoredBytes
      };
    } catch (error) {
      this.handleServiceError(error, 'CloudWatch Logs');
    }
  }

  /**
   * Get recent log events from a log group
   */
  static async getLogEvents(logGroupName: string): Promise<Array<{ timestamp: number; message: string; ingestionTime?: number }>> {
    try {
      // First get log streams
      const streamsData = await this.makeRequest<{ logStreams: Array<{ logStreamName: string; creationTime: number; lastEventTimestamp?: number; storedBytes?: number }> }>(
        `${this.SERVICE_PATH}/streams?logGroupName=${encodeURIComponent(logGroupName)}`
      );

      const streams = streamsData.logStreams || [];
      if (streams.length === 0) return [];

      // Get events from the most recent stream
      const mostRecentStream = streams[0];
      const eventsData = await this.makeRequest<{ events: Array<{ timestamp: number; message: string; ingestionTime?: number }> }>(
        `${this.SERVICE_PATH}/events?logGroupName=${encodeURIComponent(logGroupName)}&logStreamName=${encodeURIComponent(mostRecentStream.logStreamName)}`
      );

      return eventsData.events || [];
    } catch (error) {
      console.error(`Failed to get log events for ${logGroupName}:`, error);
      return [];
    }
  }

  /**
   * Get log streams for a log group
   */
  static async getLogStreams(logGroupName: string): Promise<Array<{ logStreamName: string; creationTime: number; lastEventTimestamp?: number; storedBytes?: number }>> {
    try {
      const data = await this.makeRequest<{ logStreams: Array<{ logStreamName: string; creationTime: number; lastEventTimestamp?: number; storedBytes?: number }> }>(
        `${this.SERVICE_PATH}/streams?logGroupName=${encodeURIComponent(logGroupName)}`
      );
      return data.logStreams || [];
    } catch (error) {
      console.error(`Failed to get log streams for ${logGroupName}:`, error);
      return [];
    }
  }
}