// React Context and type definitions for global refresh functionality
import { createContext } from 'react';
import type { ConnectionState } from '../../types';

export interface GlobalRefreshContextType {
  // States
  interval: number;
  isEnabled: boolean;
  lastRefresh: Date;
  isPageVisible: boolean;
  isRefreshing: boolean;
  connectionStatus: ConnectionState;
  lastError: string | null;

  // Control functions
  changeInterval: (interval: number) => void;
  toggleRefresh: () => void;
  executeRefresh: () => Promise<void>;
  formatInterval: (intervalMs: number) => string;

  // Registry functions
  registerRefreshFunction: (pageId: string, refreshFn: () => Promise<void>) => void;
  unregisterRefreshFunction: (pageId: string) => void;
}

export const GlobalRefreshContext = createContext<GlobalRefreshContextType | null>(null);