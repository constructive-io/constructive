# databaseCopyGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the databaseCopyGraph mutation

## Usage

```typescript
db.mutation.databaseCopyGraph({ input: { databaseId: '<UUID>', graphId: '<UUID>', name: '<String>' } }).execute()
```

## Examples

### Run databaseCopyGraph

```typescript
const result = await db.mutation.databaseCopyGraph({ input: { databaseId: '<UUID>', graphId: '<UUID>', name: '<String>' } }).execute();
```
