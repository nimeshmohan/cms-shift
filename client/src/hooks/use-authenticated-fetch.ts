import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export function useAuthenticatedFetch() {
  const { currentUser } = useAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: FetchOptions = {}) => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the Firebase ID token
      const token = await currentUser.getIdToken();
      const userId = currentUser.uid;

      // Add authentication headers
      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
        'Content-Type': 'application/json',
      };

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [currentUser]
  );

  return authenticatedFetch;
}
