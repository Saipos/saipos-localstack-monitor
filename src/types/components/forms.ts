// Form and control component types

import type { BaseComponentProps } from './ui';

// Refresh control types
export interface RefreshControlProps extends BaseComponentProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  lastRefresh?: Date;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  interval?: number;
  onIntervalChange?: (interval: number) => void;
}

// Search and filter types
export interface SearchFilterProps extends BaseComponentProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
  filters?: FilterOption[];
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

// SQS Message viewer types
export interface SQSMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  Attributes?: Record<string, string>;
  MessageAttributes: Record<string, unknown>;
  sentTimestamp?: number;
  approximateReceiveCount?: number;
}

export interface SQSMessagesViewerProps extends BaseComponentProps {
  queueUrl?: string;
  messages?: SQSMessage[];
  loading?: boolean;
  error?: string | null;
  onMessageDelete?: (message: SQSMessage) => void;
  onMessageRequeue?: (message: SQSMessage) => void;
  onRefresh?: () => void;
  maxMessages?: number;
}

// Page connection status
export interface PageConnectionStatusProps extends BaseComponentProps {
  isConnected: boolean;
  isChecking?: boolean;
  lastCheck?: Date;
  serviceName?: string;
  onRetry?: () => void;
}

// Generic button props for consistency
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// Input field props
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'search';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}