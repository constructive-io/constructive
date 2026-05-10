/**
 * useConnectionState — React hook for monitoring the RealtimeClient
 * WebSocket connection state.
 *
 * @example
 * ```tsx
 * function ConnectionIndicator() {
 *   const state = useConnectionState();
 *   return <span>{state}</span>; // 'connected' | 'connecting' | ...
 * }
 * ```
 */
import { useEffect, useState } from 'react';
import type { ConnectionState } from '@constructive-io/realtime';

import { useRealtimeClient } from './context';

export function useConnectionState(): ConnectionState {
  const client = useRealtimeClient();
  const [state, setState] = useState<ConnectionState>(client.getConnectionState());

  useEffect(() => {
    setState(client.getConnectionState());
    const unsubscribe = client.onConnectionStateChange(setState);
    return unsubscribe;
  }, [client]);

  return state;
}
