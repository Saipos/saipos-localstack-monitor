import { useState, useEffect } from 'react';

export interface UsePageVisibilityReturn {
  isPageVisible: boolean;
}

/**
 * Custom hook for tracking page visibility using the Page Visibility API
 */
export function usePageVisibility(): UsePageVisibilityReturn {
  const [isPageVisible, setIsPageVisible] = useState<boolean>(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isPageVisible
  };
}