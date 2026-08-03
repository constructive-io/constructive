# _secretsRemoveArray

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _secretsRemoveArray mutation

## Usage

```typescript
db.mutation._secretsRemoveArray({ input: { databaseId: '<UUID>', namespaceId: '<UUID>', realm: '<String>', secretNames: '<String>' } }).execute()
```

## Examples

### Run _secretsRemoveArray

```typescript
const result = await db.mutation._secretsRemoveArray({ input: { databaseId: '<UUID>', namespaceId: '<UUID>', realm: '<String>', secretNames: '<String>' } }).execute();
```
