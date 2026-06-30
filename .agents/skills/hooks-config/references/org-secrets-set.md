# orgSecretsSet

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for orgSecretsSet

## Usage

```typescript
const { mutate } = useOrgSecretsSetMutation(); mutate({ input: { scopeOwnerId: '<UUID>', secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } });
```

## Examples

### Use useOrgSecretsSetMutation

```typescript
const { mutate, isLoading } = useOrgSecretsSetMutation();
mutate({ input: { scopeOwnerId: '<UUID>', secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } });
```
