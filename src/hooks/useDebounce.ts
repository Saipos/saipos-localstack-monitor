import { useEffect, useState, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => ReturnType<T> {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args: Parameters<T>): ReturnType<T> => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      debounceTimer.current = setTimeout(async () => {
        try {
          const result = await callbackRef.current(...args);
          resolve(result as Awaited<ReturnType<T>>);
        } catch (error) {
          reject(error);
        }
      }, delay);
    }) as ReturnType<T>;
  }, [delay]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return debouncedCallback;
}