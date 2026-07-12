# copyGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the copyGraph mutation

## Usage

```typescript
db.mutation.copyGraph({ input: { scopeId: '<UUID>', graphId: '<UUID>', name: '<String>' } }).execute()
```

## Examples

### Run copyGraph

```typescript
const result = await db.mutation.copyGraph({ input: { scopeId: '<UUID>', graphId: '<UUID>', name: '<String>' } }).execute();
```
