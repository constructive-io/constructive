# platformInternalSecretsSet

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformInternalSecretsSet mutation

## Usage

```typescript
db.mutation.platformInternalSecretsSet({ input: { algo: '<String>', secretName: '<String>', secretNamespaceId: '<UUID>', secretValue: '<String>' } }).execute()
```

## Examples

### Run platformInternalSecretsSet

```typescript
const result = await db.mutation.platformInternalSecretsSet({ input: { algo: '<String>', secretName: '<String>', secretNamespaceId: '<UUID>', secretValue: '<String>' } }).execute();
```
