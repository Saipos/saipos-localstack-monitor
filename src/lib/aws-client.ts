import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// LocalStack configuration
const isDevelopment = import.meta.env.DEV;
const localStackConfig = {
  region: 'us-east-1',
  endpoint: isDevelopment ? '/aws' : 'http://localhost:3006/aws',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  // Disable SSL and signature verification for LocalStack
  tls: false,
  maxAttempts: 3,
  forcePathStyle: true,
  requestHandler: {
    requestTimeout: 10000,
    httpsAgent: undefined
  }
};

// DynamoDB Client
const dynamoClient = new DynamoDBClient(localStackConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoClient);

// SQS Client
export const sqsClient = new SQSClient(localStackConfig);

// CloudWatch Logs Client
export const logsClient = new CloudWatchLogsClient(localStackConfig);

// Constants for user-analytics-events project
export const TABLE_NAME = 'user-analytics-events-platform-tokens';
export const QUEUE_URL = 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/user-analytics-events-events.fifo';
export const LOG_GROUP_NAME = '/aws/lambda/user-analytics-events-events-consumer';