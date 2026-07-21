# createApiKey

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for createApiKey

## Usage

```typescript
const { mutate } = useCreateApiKeyMutation(); mutate({ input: { accessLevel: '<String>', expiresIn: '<IntervalInput>', keyName: '<String>', mfaLevel: '<String>', principalId: '<UUID>' } });
```

## Examples

### Use useCreateApiKeyMutation

```typescript
const { mutate, isLoading } = useCreateApiKeyMutation();
mutate({ input: { accessLevel: '<String>', expiresIn: '<IntervalInput>', keyName: '<String>', mfaLevel: '<String>', principalId: '<UUID>' } });
```
