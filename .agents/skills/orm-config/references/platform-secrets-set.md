# platformSecretsSet

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSecretsSet mutation

## Usage

```typescript
db.mutation.platformSecretsSet({ input: { algo: '<String>', provider: '<String>', secretName: '<String>', secretNamespaceId: '<UUID>', secretValue: '<String>' } }).execute()
```

## Examples

### Run platformSecretsSet

```typescript
const result = await db.mutation.platformSecretsSet({ input: { algo: '<String>', provider: '<String>', secretName: '<String>', secretNamespaceId: '<UUID>', secretValue: '<String>' } }).execute();
```
