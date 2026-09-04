# mintAccessToken

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for mintAccessToken

## Usage

```typescript
const { mutate } = useMintAccessTokenMutation(); mutate({ input: { accessTtl: '<IntervalInput>', intent: '<String>', principalId: '<UUID>' } });
```

## Examples

### Use useMintAccessTokenMutation

```typescript
const { mutate, isLoading } = useMintAccessTokenMutation();
mutate({ input: { accessTtl: '<IntervalInput>', intent: '<String>', principalId: '<UUID>' } });
```
