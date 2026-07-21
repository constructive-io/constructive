# copyGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the copyGraph mutation

## Usage

```typescript
db.mutation.copyGraph({ input: { graphId: '<UUID>', name: '<String>', scopeId: '<UUID>' } }).execute()
```

## Examples

### Run copyGraph

```typescript
const result = await db.mutation.copyGraph({ input: { graphId: '<UUID>', name: '<String>', scopeId: '<UUID>' } }).execute();
```
