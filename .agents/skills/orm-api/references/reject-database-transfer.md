# rejectDatabaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the rejectDatabaseTransfer mutation

## Usage

```typescript
db.mutation.rejectDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute()
```

## Examples

### Run rejectDatabaseTransfer

```typescript
const result = await db.mutation.rejectDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute();
```
