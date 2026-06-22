# saveGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the saveGraph mutation

## Usage

```typescript
db.mutation.saveGraph({ input: { graphId: '<UUID>', rootHash: '<UUID>', message: '<String>' } }).execute()
```

## Examples

### Run saveGraph

```typescript
const result = await db.mutation.saveGraph({ input: { graphId: '<UUID>', rootHash: '<UUID>', message: '<String>' } }).execute();
```
