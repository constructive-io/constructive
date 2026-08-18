# _internalSecretsRemoveArray

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _internalSecretsRemoveArray mutation

## Usage

```typescript
db.mutation._internalSecretsRemoveArray({ input: { databaseId: '<UUID>', realm: '<String>', secretNames: '<String>' } }).execute()
```

## Examples

### Run _internalSecretsRemoveArray

```typescript
const result = await db.mutation._internalSecretsRemoveArray({ input: { databaseId: '<UUID>', realm: '<String>', secretNames: '<String>' } }).execute();
```
