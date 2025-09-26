// Chart and visualization component types

import type { ColorVariant } from './ui';

// Data point for charts
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

// Chart configuration types
export type ChartType = 'line' | 'bar' | 'area' | 'pie';
export type ChartColorKey = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';

// Main chart props
export interface MetricsChartProps {
  title: string;
  data: ChartDataPoint[];
  unit?: string;
  color?: ChartColorKey;
  type?: ChartType;
  height?: number;
  showTrend?: boolean;
  loading?: boolean;
}

// Chart data processing
export interface ProcessedChartData extends ChartDataPoint {
  formattedValue: string;
  percentage?: number;
}

// Chart trend analysis
export interface ChartTrendInfo {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
  isSignificant: boolean;
  period: string;
}

// Chart tooltip data
export interface ChartTooltipData {
  point: ChartDataPoint;
  formattedValue: string;
  formattedTime: string;
  color: string;
}