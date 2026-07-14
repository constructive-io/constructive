# provisionUniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

## Usage

```typescript
const { mutate } = useProvisionUniqueConstraintMutation(); mutate({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } });
```

## Examples

### Use useProvisionUniqueConstraintMutation

```typescript
const { mutate, isLoading } = useProvisionUniqueConstraintMutation();
mutate({ input: { databaseId: '<UUID>', definition: '<JSON>', tableId: '<UUID>' } });
```
