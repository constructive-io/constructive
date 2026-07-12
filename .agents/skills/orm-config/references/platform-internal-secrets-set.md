# platformInternalSecretsSet

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformInternalSecretsSet mutation

## Usage

```typescript
db.mutation.platformInternalSecretsSet({ input: { secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute()
```

## Examples

### Run platformInternalSecretsSet

```typescript
const result = await db.mutation.platformInternalSecretsSet({ input: { secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute();
```
