// DynamoDB service for LocalStack API
import type {
  TableInfo,
  DynamoDBListTablesResponse,
  DynamoDBTableDescription
} from '../../types';
import { BaseAWSService } from './base';

export class DynamoDBService extends BaseAWSService {
  private static readonly SERVICE_PATH = '/dynamodb';

  /**
   * Check if DynamoDB service is available
   */
  static async isAvailable(): Promise<boolean> {
    return this.isServiceAvailable(`${this.SERVICE_PATH}/tables`);
  }

  /**
   * Get comprehensive DynamoDB statistics
   */
  static async getStats() {
    try {
      // List all tables
      const listData = await this.makeRequest<DynamoDBListTablesResponse>(
        `${this.SERVICE_PATH}/tables`
      );

      const tableNames = listData.TableNames || [];
      const tables: TableInfo[] = [];
      let totalItems = 0;

      // Get details for each table
      for (const tableName of tableNames) {
        try {
          const describeData = await this.makeRequest<DynamoDBTableDescription>(
            `${this.SERVICE_PATH}/table/${tableName}`
          );

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
          // Add table with zero stats on error
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
      this.handleServiceError(error, 'DynamoDB');
    }
  }

  /**
   * Scan table data with limit
   */
  static async scanTable(tableName: string, limit: number = 50): Promise<Record<string, unknown>[]> {
    try {
      const data = await this.makeRequest<{ Items: Record<string, unknown>[] }>(
        `${this.SERVICE_PATH}/table/${tableName}/scan?limit=${limit}`
      );
      return data.Items || [];
    } catch (error) {
      console.error(`Failed to scan table ${tableName}:`, error);
      return [];
    }
  }
}