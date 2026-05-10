# @constructive-io/realtime

Framework-agnostic realtime subscription client for Constructive GraphQL APIs.

Manages a single `graphql-ws` WebSocket connection and multiplexes typed subscriptions over it.

## Usage

```ts
import { RealtimeClient } from '@constructive-io/realtime';

const client = new RealtimeClient({
  url: 'wss://api.example.com/graphql',
  getToken: () => authStore.getToken(),
});

// Low-level subscribe
const unsubscribe = client.subscribe(
  { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
  'subscription { onContactChanged { event contact { id name } timestamp } }',
  {},
  {
    onEvent: (event) => console.log(event.operation, event.data),
    onError: (err) => console.error(err),
  }
);

// Cleanup
unsubscribe();
client.dispose();
```
