import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/aws-client';
import type { AnalyticsPlatformToken } from '../types';

export class DynamoDBService {
  // Get all tokens
  static async getAllTokens(): Promise<AnalyticsPlatformToken[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
      });

      const response = await docClient.send(command);
      return response.Items as AnalyticsPlatformToken[] || [];
    } catch (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }
  }

  // Get tokens by store
  static async getTokensByStore(storeId: number): Promise<AnalyticsPlatformToken[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'idStore-index',
        KeyConditionExpression: 'idStore = :storeId',
        ExpressionAttributeValues: {
          ':storeId': storeId,
        },
      });

      const response = await docClient.send(command);
      return response.Items as AnalyticsPlatformToken[] || [];
    } catch (error) {
      console.error('Error fetching tokens by store:', error);
      throw error;
    }
  }

  // Get tokens by platform
  static async getTokensByPlatform(platform: string): Promise<AnalyticsPlatformToken[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'platform-index',
        KeyConditionExpression: 'platform = :platform',
        ExpressionAttributeValues: {
          ':platform': platform,
        },
      });

      const response = await docClient.send(command);
      return response.Items as AnalyticsPlatformToken[] || [];
    } catch (error) {
      console.error('Error fetching tokens by platform:', error);
      throw error;
    }
  }

  // Get active tokens count
  static async getActiveTokensCount(): Promise<number> {
    try {
      const tokens = await this.getAllTokens();
      return tokens.filter(token => token.isActive).length;
    } catch (error) {
      console.error('Error counting active tokens:', error);
      return 0;
    }
  }

  // Get tokens by store and site data
  static async getTokensByStoreAndSite(storeId: number, siteDataId: number): Promise<AnalyticsPlatformToken[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'idStore-idStoreSiteData-index',
        KeyConditionExpression: 'idStore = :storeId AND idStoreSiteData = :siteDataId',
        ExpressionAttributeValues: {
          ':storeId': storeId,
          ':siteDataId': siteDataId,
        },
      });

      const response = await docClient.send(command);
      return response.Items as AnalyticsPlatformToken[] || [];
    } catch (error) {
      console.error('Error fetching tokens by store and site:', error);
      throw error;
    }
  }
}