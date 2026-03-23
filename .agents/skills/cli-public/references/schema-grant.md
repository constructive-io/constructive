# schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SchemaGrant records via csdk CLI

## Usage

```bash
csdk schema-grant list
csdk schema-grant get --id <UUID>
csdk schema-grant create --schemaId <UUID> --granteeName <String> [--databaseId <UUID>]
csdk schema-grant update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--granteeName <String>]
csdk schema-grant delete --id <UUID>
```

## Examples

### List all schemaGrant records

```bash
csdk schema-grant list
```

### Create a schemaGrant

```bash
csdk schema-grant create --schemaId <UUID> --granteeName <String> [--databaseId <UUID>]
```

### Get a schemaGrant by id

```bash
csdk schema-grant get --id <value>
```
