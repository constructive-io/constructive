/**
 * React context for the RealtimeClient.
 *
 * Provides a RealtimeClient instance to the component tree via
 * RealtimeProvider. Hooks use useRealtimeClient() to access it.
 */
import { createContext, useContext } from 'react';
import type { RealtimeClient } from '@constructive-io/realtime';

export const RealtimeContext = createContext<RealtimeClient | null>(null);

/**
 * Access the RealtimeClient from the nearest RealtimeProvider.
 *
 * @throws if no RealtimeProvider is found in the tree.
 */
export function useRealtimeClient(): RealtimeClient {
  const client = useContext(RealtimeContext);
  if (!client) {
    throw new Error(
      'useRealtimeClient: no RealtimeClient found. ' +
        'Wrap your app with <RealtimeProvider client={...}>.'
    );
  }
  return client;
}
