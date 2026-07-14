# provisionCheckConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a check constraint on a table from a $type + data blueprint definition. Supports: CheckOneOf (enum validation via = ANY(ARRAY[...])), CheckGreaterThan (single-column > value or cross-column), CheckLessThan (single-column < value or cross-column), CheckNotEqual (cross-column inequality). Builds AST expressions via ast_helpers and inserts into metaschema_public.check_constraint. Graceful: skips if a constraint with the same name already exists.

## Usage

```bash
csdk provision-check-constraint --input.clientMutationId <String> --input.databaseId <UUID> --input.definition <JSON> --input.tableId <UUID>
```

## Examples

### Run provisionCheckConstraint

```bash
csdk provision-check-constraint --input.clientMutationId <String> --input.databaseId <UUID> --input.definition <JSON> --input.tableId <UUID>
```
