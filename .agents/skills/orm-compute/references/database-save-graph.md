# databaseSaveGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the databaseSaveGraph mutation

## Usage

```typescript
db.mutation.databaseSaveGraph({ input: { graphId: '<UUID>', message: '<String>', rootHash: '<UUID>' } }).execute()
```

## Examples

### Run databaseSaveGraph

```typescript
const result = await db.mutation.databaseSaveGraph({ input: { graphId: '<UUID>', message: '<String>', rootHash: '<UUID>' } }).execute();
```
