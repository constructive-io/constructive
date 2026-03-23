# cancelDatabaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the cancelDatabaseTransfer mutation

## Usage

```typescript
db.mutation.cancelDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute()
```

## Examples

### Run cancelDatabaseTransfer

```typescript
const result = await db.mutation.cancelDatabaseTransfer({ input: { transferId: '<UUID>' } }).execute();
```
