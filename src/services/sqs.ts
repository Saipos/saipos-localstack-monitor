import { GetQueueAttributesCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, QUEUE_URL } from '../lib/aws-client';
import type { QueueStats, AnalyticsEvent, EventTestConfig } from '../types';

export class SQSService {
  // Get queue statistics
  static async getQueueStats(): Promise<QueueStats> {
    try {
      const visibleCommand = new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages'],
      });

      const notVisibleCommand = new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessagesNotVisible'],
      });

      const [visibleResponse, notVisibleResponse] = await Promise.all([
        sqsClient.send(visibleCommand),
        sqsClient.send(notVisibleCommand),
      ]);

      const visibleMessages = parseInt(visibleResponse.Attributes?.ApproximateNumberOfMessages || '0');
      const notVisibleMessages = parseInt(notVisibleResponse.Attributes?.ApproximateNumberOfMessagesNotVisible || '0');

      return {
        visibleMessages,
        notVisibleMessages,
        totalMessages: visibleMessages + notVisibleMessages,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      throw error;
    }
  }

  // Send test event
  static async sendTestEvent(event: AnalyticsEvent, storeId: number): Promise<string> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(event),
        MessageGroupId: `store-${storeId}`,
        MessageDeduplicationId: `test-${Date.now()}-${Math.random()}`,
      });

      const response = await sqsClient.send(command);
      return response.MessageId || '';
    } catch (error) {
      console.error('Error sending test event:', error);
      throw error;
    }
  }

  // Send multiple test events
  static async sendBatchTestEvents(config: EventTestConfig): Promise<string[]> {
    const messageIds: string[] = [];

    for (let i = 0; i < config.numberOfEvents; i++) {
      const event: AnalyticsEvent = this.createTestEvent(config.eventType, i);

      try {
        const messageId = await this.sendTestEvent(event, config.storeId);
        messageIds.push(messageId);

        // Add delay between messages if specified
        if (config.intervalMs > 0 && i < config.numberOfEvents - 1) {
          await this.delay(config.intervalMs);
        }
      } catch (error) {
        console.error(`Error sending event ${i + 1}:`, error);
      }
    }

    return messageIds;
  }

  // Create test event based on type
  private static createTestEvent(eventType: string, index: number): AnalyticsEvent {
    const baseEvent = {
      content_type: 'product',
      currency: 'BRL',
    };

    switch (eventType) {
      case 'AddToCart':
        return {
          event: 'AddToCart',
          value: {
            ...baseEvent,
            content_ids: [25535709 + index],
            value: 29.99 + index,
            contents: [{
              id: (25535709 + index).toString(),
              quantity: 1,
              item_price: 29.99 + index,
            }],
          },
        };

      case 'Purchase':
        return {
          event: 'Purchase',
          value: {
            ...baseEvent,
            content_ids: [25535709 + index, 25535710 + index],
            value: 59.99 + index,
            contents: [
              {
                id: (25535709 + index).toString(),
                quantity: 1,
                item_price: 29.99 + index,
              },
              {
                id: (25535710 + index).toString(),
                quantity: 1,
                item_price: 30.00 + index,
              },
            ],
          },
        };

      case 'PageView':
        return {
          event: 'PageView',
          value: {
            ...baseEvent,
            content_ids: [25535709 + index],
            value: 0,
            contents: [{
              id: (25535709 + index).toString(),
              quantity: 1,
              item_price: 0,
            }],
          },
        };

      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  // Utility function for delays
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}