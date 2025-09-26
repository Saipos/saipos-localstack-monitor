import { useCallback, useState } from 'react';
import { LOCALSTACK_STATUS } from '../../constants';
import { LocalStackApiService } from '../../services/localstack-api';
import type { ServiceAvailability } from '../../types';

export interface UseServiceAvailabilityReturn {
  serviceAvailability: ServiceAvailability;
  localstackStatus: keyof typeof LOCALSTACK_STATUS;
  checkAvailability: () => Promise<void>;
  setServiceAvailability: (availability: ServiceAvailability) => void;
}

const initialAvailability: ServiceAvailability = {
  dynamodb: false,
  sqs: false,
  lambda: false,
  logs: false
};

/**
 * Custom hook for checking and managing service availability
 */
export function useServiceAvailability(): UseServiceAvailabilityReturn {
  const [serviceAvailability, setServiceAvailability] = useState<ServiceAvailability>(initialAvailability);
  const [localstackStatus, setLocalstackStatus] = useState<keyof typeof LOCALSTACK_STATUS>('CHECKING');

  const checkAvailability = useCallback(async () => {
    const [dynamodb, sqs, lambda, logs] = await Promise.all([
      LocalStackApiService.isDynamoDBAvailable(),
      LocalStackApiService.isSQSAvailable(),
      LocalStackApiService.isLambdaAvailable(),
      LocalStackApiService.isCloudWatchLogsAvailable()
    ]);

    const availability = { dynamodb, sqs, lambda, logs };
    setServiceAvailability(availability);

    // Determine overall LocalStack status
    const availableServices = [dynamodb, sqs, lambda, logs].filter(Boolean).length;

    if (availableServices === 0) {
      setLocalstackStatus('OFFLINE');
    } else if (availableServices === 4) {
      setLocalstackStatus('ONLINE');
    } else {
      // Some services available, some not - could be starting up or partial issues
      setLocalstackStatus('ONLINE'); // Consider partially working as online
    }
  }, []);

  return {
    serviceAvailability,
    localstackStatus,
    checkAvailability,
    setServiceAvailability
  };
}