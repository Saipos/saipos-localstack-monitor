// Table component types and interfaces

import type { BaseComponentProps } from './ui';

// Generic table types
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface TableSortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// DynamoDB specific types
export interface DynamoDBItem {
  [key: string]: string | number | boolean | null | DynamoDBItem | DynamoDBItem[];
}

export interface DynamoDBRawItem {
  [key: string]: {
    S?: string;
    N?: string;
    B?: string;
    SS?: string[];
    NS?: string[];
    BS?: string[];
    M?: string | DynamoDBRawItem;
    L?: string | DynamoDBRawItem[];
    NULL?: boolean;
    BOOL?: boolean;
  };
}

export interface DynamoDBTableProps extends BaseComponentProps {
  data: DynamoDBRawItem[];
  tableName: string;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
}

// Generic data table props
export interface DataTableProps<T = Record<string, unknown>> extends BaseComponentProps {
  data: T[];
  columns: TableColumn[];
  loading?: boolean;
  error?: string | null;
  searchable?: boolean;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onSort?: (sort: TableSortConfig) => void;
  onSearch?: (term: string) => void;
  emptyMessage?: string;
}

// Table pagination
export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}