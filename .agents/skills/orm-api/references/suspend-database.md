# suspendDatabase

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the suspendDatabase mutation

## Usage

```typescript
db.mutation.suspendDatabase({ input: { databaseId: '<UUID>', reason: '<String>' } }).execute()
```

## Examples

### Run suspendDatabase

```typescript
const result = await db.mutation.suspendDatabase({ input: { databaseId: '<UUID>', reason: '<String>' } }).execute();
```
