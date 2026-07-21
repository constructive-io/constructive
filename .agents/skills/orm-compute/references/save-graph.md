# saveGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the saveGraph mutation

## Usage

```typescript
db.mutation.saveGraph({ input: { graphId: '<UUID>', message: '<String>', rootHash: '<UUID>' } }).execute()
```

## Examples

### Run saveGraph

```typescript
const result = await db.mutation.saveGraph({ input: { graphId: '<UUID>', message: '<String>', rootHash: '<UUID>' } }).execute();
```
