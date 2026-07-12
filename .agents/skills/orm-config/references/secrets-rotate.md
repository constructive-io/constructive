# _secretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _secretsRotate mutation

## Usage

```typescript
db.mutation._secretsRotate({ input: { databaseId: '<UUID>', secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute()
```

## Examples

### Run _secretsRotate

```typescript
const result = await db.mutation._secretsRotate({ input: { databaseId: '<UUID>', secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```
