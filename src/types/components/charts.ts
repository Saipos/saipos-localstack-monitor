export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export type ChartType = 'line' | 'bar' | 'area' | 'pie';
export type ChartColorKey = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';

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

export interface ProcessedChartData extends ChartDataPoint {
  formattedValue: string;
  percentage?: number;
}

export interface ChartTrendInfo {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
  isSignificant: boolean;
  period: string;
}

export interface ChartTooltipData {
  point: ChartDataPoint;
  formattedValue: string;
  formattedTime: string;
  color: string;
}