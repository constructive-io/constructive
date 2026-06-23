# orgSecretsSet

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgSecretsSet mutation

## Usage

```typescript
db.mutation.orgSecretsSet({ input: { scopeOwnerId: '<UUID>', secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute()
```

## Examples

### Run orgSecretsSet

```typescript
const result = await db.mutation.orgSecretsSet({ input: { scopeOwnerId: '<UUID>', secretName: '<String>', secretValue: '<String>', secretNamespaceId: '<UUID>', algo: '<String>' } }).execute();
```
