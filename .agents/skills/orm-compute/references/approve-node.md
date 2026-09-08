# approveNode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the approveNode mutation

## Usage

```typescript
db.mutation.approveNode({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } }).execute()
```

## Examples

### Run approveNode

```typescript
const result = await db.mutation.approveNode({ input: { approved: '<Boolean>', executionId: '<UUID>', feedback: '<JSON>', nodeName: '<String>' } }).execute();
```
