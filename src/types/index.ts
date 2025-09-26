// Centralized type exports
export * from './api/aws-api';
export * from './domain';

// Export component types with specific names to avoid conflicts
export type {
  // UI Components
  BaseComponentProps,
  ColorVariant,
  SizeVariant,
  StatusVariant,
  StatusBadgeStatus,
  StatusBadgeProps,
  MetricCardProps,
  ServiceStatusProps,
  ConnectionStatusProps,
  ErrorBoundaryProps,
  ErrorBoundaryState,
  HeaderProps,
  ProjectMode,
  ProjectSelectorProps,

  // Dashboard Components (use prefixes for conflicting types)
  ServiceMetricsSectionProps,
  StoreData,
  StoreTokensViewProps,
  LambdaFunctionDetailsProps,
  LogEvent as ComponentLogEvent,
  LogStream as ComponentLogStream,
  LambdaLogsViewerProps,
  InvocationResult,
  DebugResult,
  DebugTestPanelProps,
  TestResults,
  BasicLocalStackDashboardProps,
  LambdaFunctionDisplay,
  QueueInfo as ComponentQueueInfo,
  QueueMetrics,
  QueueHistoryPoint,
  DynamoTable,
  LambdaSectionProps,
  LogsSectionProps,
  DynamoDBSectionProps,

  // Charts
  ChartDataPoint,
  ChartType,
  ChartColorKey,
  MetricsChartProps,

  // Tables
  TableColumn,
  TableSortConfig,
  DynamoDBItem,
  DynamoDBRawItem,
  DynamoDBTableProps,
  DataTableProps,
  TablePaginationProps,

  // Forms (use prefixes for conflicting types)
  RefreshControlProps,
  SearchFilterProps,
  FilterOption,
  SQSMessage as ComponentSQSMessage,
  SQSMessagesViewerProps,
  PageConnectionStatusProps,
  ButtonProps,
  InputProps
} from './components';