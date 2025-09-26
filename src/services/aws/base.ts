// Base service class for AWS services via LocalStack API
import { API_BASE_URL } from '../../constants';

export abstract class BaseAWSService {
  protected static readonly baseUrl = API_BASE_URL;

  /**
   * Generic method for making HTTP requests to the API
   */
  protected static async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      if (response.status === 500) {
        throw new Error('Service unavailable');
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if a specific service is available
   */
  protected static async isServiceAvailable(servicePath: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${servicePath}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Handle common error scenarios
   */
  protected static handleServiceError(error: unknown, serviceName: string): never {
    console.error(`Failed to access ${serviceName}:`, error);

    if (error instanceof Error && (error.message.includes('500') || error.message.includes('Service unavailable'))) {
      throw new Error(`Serviço ${serviceName} indisponível`);
    }

    throw error;
  }
}