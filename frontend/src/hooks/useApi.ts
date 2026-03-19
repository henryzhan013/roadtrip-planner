import { useState, useCallback } from 'react';
import { api, ApiError } from '../utils/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T, P = void> extends UseApiState<T> {
  execute: (params: P) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T, P = void>(
  apiCall: (params: P) => Promise<T>
): UseApiReturn<T, P> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (params: P): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const data = await apiCall(params);
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Request failed';
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [apiCall]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// Convenience hooks for common API operations
export function useGet<T>(endpoint: string) {
  return useApi<T, void>(() => api.get<T>(endpoint));
}

export function usePost<T, P>(endpoint: string) {
  return useApi<T, P>((data: P) => api.post<T>(endpoint, data));
}

export function usePatch<T, P>(endpoint: string) {
  return useApi<T, P>((data: P) => api.patch<T>(endpoint, data));
}

export function useDelete<T>(endpoint: string) {
  return useApi<T, void>(() => api.delete<T>(endpoint));
}
