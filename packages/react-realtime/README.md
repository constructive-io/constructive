# @constructive-io/react-realtime

React hooks for Constructive realtime subscriptions with React Query cache bridge.

## Usage

```tsx
import { RealtimeClient } from '@constructive-io/realtime';
import { RealtimeProvider, useConnectionState } from '@constructive-io/react-realtime';

const client = new RealtimeClient({
  url: 'wss://api.example.com/graphql',
  getToken: () => authStore.getToken(),
});

function App() {
  return (
    <RealtimeProvider client={client}>
      <MyApp />
    </RealtimeProvider>
  );
}

function ConnectionStatus() {
  const state = useConnectionState();
  return <span>{state}</span>;
}
```
