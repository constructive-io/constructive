# createApiKey

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for createApiKey

## Usage

```typescript
const { mutate } = useCreateApiKeyMutation(); mutate({ input: { keyName: '<String>', accessLevel: '<String>', mfaLevel: '<String>', expiresIn: '<IntervalInput>' } });
```

## Examples

### Use useCreateApiKeyMutation

```typescript
const { mutate, isLoading } = useCreateApiKeyMutation();
mutate({ input: { keyName: '<String>', accessLevel: '<String>', mfaLevel: '<String>', expiresIn: '<IntervalInput>' } });
```
