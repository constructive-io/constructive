# _secretsDel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _secretsDel mutation

## Usage

```typescript
db.mutation._secretsDel({ input: { databaseId: '<UUID>', namespaceId: '<UUID>', realm: '<String>', secretName: '<String>' } }).execute()
```

## Examples

### Run _secretsDel

```typescript
const result = await db.mutation._secretsDel({ input: { databaseId: '<UUID>', namespaceId: '<UUID>', realm: '<String>', secretName: '<String>' } }).execute();
```
