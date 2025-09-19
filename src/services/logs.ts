import { DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { logsClient, LOG_GROUP_NAME } from '../lib/aws-client';
import type { LambdaLogEvent } from '../types';

export class LogsService {
  // Get latest log streams
  static async getLogStreams(): Promise<string[]> {
    try {
      const command = new DescribeLogStreamsCommand({
        logGroupName: LOG_GROUP_NAME,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 10,
      });

      const response = await logsClient.send(command);
      return response.logStreams?.map(stream => stream.logStreamName || '') || [];
    } catch (error) {
      console.error('Error fetching log streams:', error);
      return [];
    }
  }

  // Get log events from the latest stream
  static async getLatestLogEvents(limit: number = 50): Promise<LambdaLogEvent[]> {
    try {
      const streams = await this.getLogStreams();
      if (streams.length === 0) return [];

      const command = new GetLogEventsCommand({
        logGroupName: LOG_GROUP_NAME,
        logStreamName: streams[0], // Get from latest stream
        limit,
        startFromHead: false, // Get latest events first
      });

      const response = await logsClient.send(command);

      return response.events?.map(event => ({
        timestamp: new Date(event.timestamp || 0).toISOString(),
        message: event.message || '',
        level: this.extractLogLevel(event.message || ''),
      })).reverse() || []; // Reverse to show newest first
    } catch (error) {
      console.error('Error fetching log events:', error);
      return [];
    }
  }

  // Get log events from a specific stream
  static async getLogEventsFromStream(streamName: string, limit: number = 50): Promise<LambdaLogEvent[]> {
    try {
      const command = new GetLogEventsCommand({
        logGroupName: LOG_GROUP_NAME,
        logStreamName: streamName,
        limit,
        startFromHead: false,
      });

      const response = await logsClient.send(command);

      return response.events?.map(event => ({
        timestamp: new Date(event.timestamp || 0).toISOString(),
        message: event.message || '',
        level: this.extractLogLevel(event.message || ''),
      })).reverse() || [];
    } catch (error) {
      console.error('Error fetching log events from stream:', error);
      return [];
    }
  }

  // Extract log level from message
  private static extractLogLevel(message: string): 'info' | 'warn' | 'error' {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('"level":"error"') || lowerMessage.includes('error')) {
      return 'error';
    }

    if (lowerMessage.includes('"level":"warn"') || lowerMessage.includes('warning') || lowerMessage.includes('warn')) {
      return 'warn';
    }

    return 'info';
  }

  // Get real-time logs (polling)
  static async startLogPolling(
    onLogEvent: (events: LambdaLogEvent[]) => void,
    intervalMs: number = 2000
  ): Promise<() => void> {
    let isPolling = true;
    let lastTimestamp = Date.now();

    const poll = async () => {
      if (!isPolling) return;

      try {
        const streams = await this.getLogStreams();
        if (streams.length === 0) {
          setTimeout(poll, intervalMs);
          return;
        }

        const command = new GetLogEventsCommand({
          logGroupName: LOG_GROUP_NAME,
          logStreamName: streams[0],
          startTime: lastTimestamp,
          limit: 100,
        });

        const response = await logsClient.send(command);

        if (response.events && response.events.length > 0) {
          const newEvents = response.events.map(event => ({
            timestamp: new Date(event.timestamp || 0).toISOString(),
            message: event.message || '',
            level: this.extractLogLevel(event.message || ''),
          }));

          onLogEvent(newEvents);

          // Update last timestamp to the latest event
          const latestEvent = response.events[response.events.length - 1];
          if (latestEvent.timestamp) {
            lastTimestamp = latestEvent.timestamp + 1; // +1 to avoid duplicate
          }
        }
      } catch (error) {
        console.error('Error in log polling:', error);
      }

      setTimeout(poll, intervalMs);
    };

    poll();

    // Return stop function
    return () => {
      isPolling = false;
    };
  }
}