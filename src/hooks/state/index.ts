// Specialized state management hooks
export { useConnectionStatus } from './useConnectionStatus';
export { usePageVisibility } from './usePageVisibility';
export { useRefreshTimer } from './useRefreshTimer';
export { useRefreshRegistry } from './useRefreshRegistry';

// Global refresh functionality (separated for ESLint compliance)
export { GlobalRefreshContext } from './GlobalRefreshContext';
export type { GlobalRefreshContextType } from './GlobalRefreshContext';
export { GlobalRefreshProvider } from './GlobalRefreshProvider';
export { useGlobalRefresh } from './useGlobalRefreshComposed';

// Legacy compatibility from original useGlobalRefresh.tsx
export { usePageRefresh } from '../useGlobalRefresh';

// Re-export types
export type { UseConnectionStatusReturn } from './useConnectionStatus';
export type { UsePageVisibilityReturn } from './usePageVisibility';
export type { UseRefreshTimerReturn } from './useRefreshTimer';
export type { UseRefreshRegistryReturn } from './useRefreshRegistry';