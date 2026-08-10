# recomputeCapabilities

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the recomputeCapabilities mutation

## Usage

```typescript
db.mutation.recomputeCapabilities({ input: { actorId: '<UUID>' } }).execute()
```

## Examples

### Run recomputeCapabilities

```typescript
const result = await db.mutation.recomputeCapabilities({ input: { actorId: '<UUID>' } }).execute();
```
