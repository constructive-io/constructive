# provisionUniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

## Usage

```typescript
db.mutation.provisionUniqueConstraint({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } }).execute()
```

## Examples

### Run provisionUniqueConstraint

```typescript
const result = await db.mutation.provisionUniqueConstraint({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } }).execute();
```
