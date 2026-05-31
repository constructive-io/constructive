# provisionUniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a unique constraint on a table. Accepts a jsonb definition with columns (array of field names). Graceful: skips if the exact same unique constraint already exists.

## Usage

```bash
csdk provision-unique-constraint --input.clientMutationId <String> --input.databaseId <UUID> --input.tableId <UUID> --input.definition <JSON>
```

## Examples

### Run provisionUniqueConstraint

```bash
csdk provision-unique-constraint --input.clientMutationId <String> --input.databaseId <UUID> --input.tableId <UUID> --input.definition <JSON>
```
