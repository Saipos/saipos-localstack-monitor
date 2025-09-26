// Utility functions for formatting data

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString();
};

export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

// Numeric parsing utilities
export const safeParseInt = (value: string | number, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const safeParseFloat = (value: string | number, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// String formatting utilities
export const formatWithLocale = (value: number): string => {
  return value.toLocaleString();
};

export const formatTimestamp = (timestamp: number | string): string => {
  const time = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return new Date(time).toLocaleString();
};

export const formatTime = (date: Date | string | number): string => {
  return new Date(date).toLocaleTimeString();
};

export const formatDateOnly = (date: Date | string | number): string => {
  return new Date(date).toLocaleDateString();
};

export const formatFullDateTime = (date: Date | string | number): string => {
  return new Date(date).toLocaleString();
};