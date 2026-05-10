/**
 * RealtimeProvider — wraps your React app to provide a RealtimeClient.
 *
 * @example
 * ```tsx
 * import { RealtimeClient } from '@constructive-io/realtime';
 * import { RealtimeProvider } from '@constructive-io/react-realtime';
 *
 * const realtime = new RealtimeClient({
 *   url: 'wss://api.example.com/graphql',
 *   getToken: () => authStore.getToken(),
 * });
 *
 * function App() {
 *   return (
 *     <RealtimeProvider client={realtime}>
 *       <MyApp />
 *     </RealtimeProvider>
 *   );
 * }
 * ```
 */
import type { ReactNode } from 'react';
import React from 'react';
import type { RealtimeClient } from '@constructive-io/realtime';

import { RealtimeContext } from './context';

export interface RealtimeProviderProps {
  client: RealtimeClient;
  children: ReactNode;
}

export function RealtimeProvider({ client, children }: RealtimeProviderProps) {
  return (
    <RealtimeContext.Provider value={client}>
      {children}
    </RealtimeContext.Provider>
  );
}
