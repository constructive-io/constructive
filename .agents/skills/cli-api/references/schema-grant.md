# schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SchemaGrant records via csdk CLI

## Usage

```bash
csdk schema-grant list
csdk schema-grant list --where.<field>.<op> <value> --orderBy <values>
csdk schema-grant list --limit 10 --after <cursor>
csdk schema-grant find-first --where.<field>.<op> <value>
csdk schema-grant get --id <UUID>
csdk schema-grant create --schemaId <UUID> --granteeName <String> [--databaseId <UUID>]
csdk schema-grant update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--granteeName <String>]
csdk schema-grant delete --id <UUID>
```

## Examples

### List schemaGrant records

```bash
csdk schema-grant list
```

### List schemaGrant records with pagination

```bash
csdk schema-grant list --limit 10 --offset 0
```

### List schemaGrant records with cursor pagination

```bash
csdk schema-grant list --limit 10 --after <cursor>
```

### Find first matching schemaGrant

```bash
csdk schema-grant find-first --where.id.equalTo <value>
```

### List schemaGrant records with field selection

```bash
csdk schema-grant list --select id,id
```

### List schemaGrant records with filtering and ordering

```bash
csdk schema-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a schemaGrant

```bash
csdk schema-grant create --schemaId <UUID> --granteeName <String> [--databaseId <UUID>]
```

### Get a schemaGrant by id

```bash
csdk schema-grant get --id <value>
```
