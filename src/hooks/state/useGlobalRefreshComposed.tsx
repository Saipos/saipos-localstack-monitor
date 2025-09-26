// Custom hook for accessing global refresh context
import { useContext } from 'react';
import { GlobalRefreshContext, type GlobalRefreshContextType } from './GlobalRefreshContext';

/**
 * Hook to access global refresh functionality
 * Must be used within a GlobalRefreshProvider
 */
export function useGlobalRefresh(): GlobalRefreshContextType {
  const context = useContext(GlobalRefreshContext);
  if (!context) {
    throw new Error('useGlobalRefresh must be used within a GlobalRefreshProvider');
  }
  return context;
}