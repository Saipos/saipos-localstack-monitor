// Common UI component types and interfaces

import type { ReactNode } from 'react';

// Color system for UI components
export type ColorVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan' | 'gray';
export type SizeVariant = 'sm' | 'md' | 'lg' | 'xl';
export type StatusVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Status Badge types
export type StatusBadgeStatus = 'active' | 'inactive' | 'processing' | 'error' | 'success' | 'warning' | 'info' | 'neutral';

export interface StatusBadgeProps extends BaseComponentProps {
  status: StatusBadgeStatus;
  text?: string;
  pulse?: boolean;
}

// Metric Card types
export interface MetricCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: ColorVariant;
  trend?: {
    value: number;
    isPositive: boolean;
  } | {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    isGood?: boolean;
  };
  onClick?: () => void;
}

// Service Status types
export interface ServiceStatusProps extends BaseComponentProps {
  serviceName: string;
  isAvailable: boolean;
  isLoading?: boolean;
}

// Connection Status types
export interface ConnectionStatusProps extends BaseComponentProps {
  status: 'connected' | 'disconnected' | 'checking' | 'error';
  lastUpdate?: Date;
  compact?: boolean;
}

// Error Boundary types
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
}

// Header types
export interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Project Selector types
export type ProjectMode = 'basic' | 'advanced' | 'custom';

export interface ProjectSelectorProps {
  selectedProject: ProjectMode;
  onProjectChange: (project: ProjectMode) => void;
}