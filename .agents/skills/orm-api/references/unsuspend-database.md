# unsuspendDatabase

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the unsuspendDatabase mutation

## Usage

```typescript
db.mutation.unsuspendDatabase({ input: { databaseId: '<UUID>', reason: '<String>' } }).execute()
```

## Examples

### Run unsuspendDatabase

```typescript
const result = await db.mutation.unsuspendDatabase({ input: { databaseId: '<UUID>', reason: '<String>' } }).execute();
```
