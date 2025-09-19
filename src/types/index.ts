// Analytics Platform Token
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

// Analytics Event
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

// SQS Queue Stats
export interface QueueStats {
  visibleMessages: number;
  notVisibleMessages: number;
  totalMessages: number;
  lastUpdated: Date;
}

// Lambda Log Event
export interface LambdaLogEvent {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalTokens: number;
  activeTokens: number;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  processingRate: number;
}

// Event Test Configuration
export interface EventTestConfig {
  eventType: 'AddToCart' | 'Purchase' | 'PageView';
  storeId: number;
  numberOfEvents: number;
  intervalMs: number;
}