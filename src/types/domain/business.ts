// Domain-specific business types
export interface AnalyticsPlatformToken {
  idPlatformToken: string;
  idStore: number;
  idStoreSiteData: number;
  platform: 'meta' | 'google' | 'tiktok';
  tokenEncrypted: string;
  tokenLast6Digits: string;
  pixelId: string;
  idUser: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEvent {
  event: string;
  value: {
    content_type: string;
    content_ids: number[];
    value: number;
    currency: string;
    contents: Array<{
      id: string;
      quantity: number;
      item_price: number;
    }>;
  };
}

export interface EventTestConfig {
  eventType: 'AddToCart' | 'Purchase' | 'PageView';
  storeId: number;
  numberOfEvents: number;
  intervalMs: number;
}

export interface DashboardMetrics {
  totalTokens: number;
  activeTokens: number;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  processingRate: number;
}