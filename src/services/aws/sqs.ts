// SQS service for LocalStack API
import type {
  QueueInfo,
  SQSListQueuesResponse,
  SQSQueueAttributes
} from '../../types';
import { BaseAWSService } from './base';

export class SQSService extends BaseAWSService {
  private static readonly SERVICE_PATH = '/sqs';

  /**
   * Check if SQS service is available
   */
  static async isAvailable(): Promise<boolean> {
    return this.isServiceAvailable(`${this.SERVICE_PATH}/queues`);
  }

  /**
   * Get comprehensive SQS statistics
   */
  static async getStats() {
    try {
      const data = await this.makeRequest<SQSListQueuesResponse>(
        `${this.SERVICE_PATH}/queues`
      );

      const queueUrls = data.QueueUrls || [];
      const queues: QueueInfo[] = [];
      let totalVisible = 0;
      let totalNotVisible = 0;

      // Get attributes for each queue
      for (const queueUrl of queueUrls) {
        try {
          const queueName = queueUrl.split('/').pop() || 'unknown';

          const attrData = await this.makeRequest<SQSQueueAttributes>(
            `${this.SERVICE_PATH}/queue-attributes?queueUrl=${encodeURIComponent(queueUrl)}`
          );

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
      this.handleServiceError(error, 'SQS');
    }
  }

  /**
   * Get messages from a specific queue
   */
  static async getMessages(queueUrl: string, maxMessages: number = 10): Promise<{ MessageId: string; ReceiptHandle: string; Body: string; Attributes?: Record<string, string> }[]> {
    try {
      const data = await this.makeRequest<{ Messages: { MessageId: string; ReceiptHandle: string; Body: string; Attributes?: Record<string, string> }[] }>(
        `${this.SERVICE_PATH}/receive-messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueUrl,
            maxNumberOfMessages: maxMessages,
            waitTimeSeconds: 0,
            visibilityTimeout: 30
          })
        }
      );
      return data.Messages || [];
    } catch (error) {
      this.handleServiceError(error, 'SQS');
    }
  }

  /**
   * Delete a message from queue
   */
  static async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      await this.makeRequest(
        `${this.SERVICE_PATH}/delete-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueUrl, receiptHandle })
        }
      );
    } catch (error) {
      this.handleServiceError(error, 'SQS');
    }
  }

  /**
   * Send a message to queue
   */
  static async sendMessage(
    queueUrl: string,
    messageBody: string,
    attributes?: Record<string, unknown>
  ): Promise<void> {
    try {
      const payload: { queueUrl: string; messageBody: string; messageAttributes: Record<string, string>; messageGroupId?: string; messageDeduplicationId?: string } = {
        queueUrl,
        messageBody,
        messageAttributes: attributes
          ? Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, String(value)]))
          : {}
      };

      // Handle FIFO queue requirements
      if (queueUrl.endsWith('.fifo')) {
        payload.messageGroupId = 'default-group';
        payload.messageDeduplicationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      await this.makeRequest(
        `${this.SERVICE_PATH}/send-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
    } catch (error) {
      this.handleServiceError(error, 'SQS');
    }
  }
}