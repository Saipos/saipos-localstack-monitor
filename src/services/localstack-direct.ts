// Direct LocalStack API calls without AWS SDK (to avoid CORS issues)

export class LocalStackDirectService {
  private static baseUrl = '/aws';

  // Test connectivity
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { mode: 'cors' });
      const isLocalStack = response.headers.get('x-localstack') === 'true';
      console.log('LocalStack test:', {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        isLocalStack
      });
      return response.ok && isLocalStack;
    } catch (error) {
      console.error('LocalStack connection test failed:', error);
      return false;
    }
  }

  // Get DynamoDB tables
  static async getDynamoTables(): Promise<string[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          'X-Amz-Target': 'DynamoDB_20120810.ListTables',
        },
        body: JSON.stringify({}),
      });

      console.log('DynamoDB ListTables response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('DynamoDB tables:', data);
        return data.TableNames || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get DynamoDB tables:', error);
      return [];
    }
  }

  // Get SQS queues
  static async getSQSQueues(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/?Action=ListQueues&Version=2012-11-05`);

      if (response.ok) {
        const text = await response.text();
        // Parse XML response to extract queue URLs
        const urls = text.match(/<QueueUrl>(.*?)<\/QueueUrl>/g) || [];
        return urls.map(url => url.replace(/<\/?QueueUrl>/g, ''));
      }
      return [];
    } catch (error) {
      console.error('Failed to get SQS queues:', error);
      return [];
    }
  }

  // Get queue attributes
  static async getQueueAttributes(queueUrl: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        Action: 'GetQueueAttributes',
        Version: '2012-11-05',
        QueueUrl: queueUrl,
        'AttributeName.1': 'ApproximateNumberOfMessages',
        'AttributeName.2': 'ApproximateNumberOfMessagesNotVisible',
      });

      const response = await fetch(`${this.baseUrl}/?${params}`);

      if (response.ok) {
        const text = await response.text();
        // Parse XML to extract attributes
        const visibleMatch = text.match(/<Name>ApproximateNumberOfMessages<\/Name>\s*<Value>(\d+)<\/Value>/);
        const notVisibleMatch = text.match(/<Name>ApproximateNumberOfMessagesNotVisible<\/Name>\s*<Value>(\d+)<\/Value>/);

        return {
          ApproximateNumberOfMessages: visibleMatch ? parseInt(visibleMatch[1]) : 0,
          ApproximateNumberOfMessagesNotVisible: notVisibleMatch ? parseInt(notVisibleMatch[1]) : 0,
        };
      }
      return { ApproximateNumberOfMessages: 0, ApproximateNumberOfMessagesNotVisible: 0 };
    } catch (error) {
      console.error('Failed to get queue attributes:', error);
      return { ApproximateNumberOfMessages: 0, ApproximateNumberOfMessagesNotVisible: 0 };
    }
  }

  // Send test message to SQS
  static async sendTestMessage(queueUrl: string, message: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        Action: 'SendMessage',
        Version: '2012-11-05',
        QueueUrl: queueUrl,
        MessageBody: message,
        MessageGroupId: 'test-group',
        MessageDeduplicationId: `test-${Date.now()}`,
      });

      const response = await fetch(`${this.baseUrl}/?${params}`, {
        method: 'POST',
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send test message:', error);
      return false;
    }
  }

  // Scan DynamoDB table
  static async scanDynamoTable(tableName: string): Promise<any[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.0',
          'X-Amz-Target': 'DynamoDB_20120810.Scan',
        },
        body: JSON.stringify({
          TableName: tableName,
          Limit: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.Items || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to scan DynamoDB table:', error);
      return [];
    }
  }
}