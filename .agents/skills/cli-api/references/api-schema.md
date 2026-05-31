# apiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ApiSchema records via csdk CLI

## Usage

```bash
csdk api-schema list
csdk api-schema list --where.<field>.<op> <value> --orderBy <values>
csdk api-schema list --limit 10 --after <cursor>
csdk api-schema find-first --where.<field>.<op> <value>
csdk api-schema get --id <UUID>
csdk api-schema create --databaseId <UUID> --schemaId <UUID> --apiId <UUID>
csdk api-schema update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--apiId <UUID>]
csdk api-schema delete --id <UUID>
```

## Examples

### List apiSchema records

```bash
csdk api-schema list
```

### List apiSchema records with pagination

```bash
csdk api-schema list --limit 10 --offset 0
```

### List apiSchema records with cursor pagination

```bash
csdk api-schema list --limit 10 --after <cursor>
```

### Find first matching apiSchema

```bash
csdk api-schema find-first --where.id.equalTo <value>
```

### List apiSchema records with field selection

```bash
csdk api-schema list --select id,id
```

### List apiSchema records with filtering and ordering

```bash
csdk api-schema list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a apiSchema

```bash
csdk api-schema create --databaseId <UUID> --schemaId <UUID> --apiId <UUID>
```

### Get a apiSchema by id

```bash
csdk api-schema get --id <value>
```
