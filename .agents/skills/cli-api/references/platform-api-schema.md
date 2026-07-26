# platformApiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformApiSchema records via csdk CLI

## Usage

```bash
csdk platform-api-schema list
csdk platform-api-schema list --where.<field>.<op> <value> --orderBy <values>
csdk platform-api-schema list --limit 10 --after <cursor>
csdk platform-api-schema find-first --where.<field>.<op> <value>
csdk platform-api-schema get --id <UUID>
csdk platform-api-schema create --apiId <UUID> --schemaId <UUID>
csdk platform-api-schema update --id <UUID> [--apiId <UUID>] [--schemaId <UUID>]
csdk platform-api-schema delete --id <UUID>
```

## Examples

### List platformApiSchema records

```bash
csdk platform-api-schema list
```

### List platformApiSchema records with pagination

```bash
csdk platform-api-schema list --limit 10 --offset 0
```

### List platformApiSchema records with cursor pagination

```bash
csdk platform-api-schema list --limit 10 --after <cursor>
```

### Find first matching platformApiSchema

```bash
csdk platform-api-schema find-first --where.id.equalTo <value>
```

### List platformApiSchema records with field selection

```bash
csdk platform-api-schema list --select id,id
```

### List platformApiSchema records with filtering and ordering

```bash
csdk platform-api-schema list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformApiSchema

```bash
csdk platform-api-schema create --apiId <UUID> --schemaId <UUID>
```

### Get a platformApiSchema by id

```bash
csdk platform-api-schema get --id <value>
```
