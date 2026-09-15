# _internalSecretsSet

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _internalSecretsSet mutation

## Usage

```typescript
db.mutation._internalSecretsSet({ input: { algo: '<String>', scopeDatabaseId: '<UUID>', secretName: '<String>', secretRealm: '<String>', secretValue: '<String>' } }).execute()
```

## Examples

### Run _internalSecretsSet

```typescript
const result = await db.mutation._internalSecretsSet({ input: { algo: '<String>', scopeDatabaseId: '<UUID>', secretName: '<String>', secretRealm: '<String>', secretValue: '<String>' } }).execute();
```
