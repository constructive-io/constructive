# provisionCheckConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

## Usage

```typescript
const { mutate } = useProvisionCheckConstraintMutation(); mutate({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } });
```

## Examples

### Use useProvisionCheckConstraintMutation

```typescript
const { mutate, isLoading } = useProvisionCheckConstraintMutation();
mutate({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } });
```
