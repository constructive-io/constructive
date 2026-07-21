# _secretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _secretsRotate mutation

## Usage

```typescript
db.mutation._secretsRotate({ input: { algo: '<String>', databaseId: '<UUID>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute()
```

## Examples

### Run _secretsRotate

```typescript
const result = await db.mutation._secretsRotate({ input: { algo: '<String>', databaseId: '<UUID>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute();
```
