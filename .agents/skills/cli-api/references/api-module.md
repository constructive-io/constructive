# apiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ApiModule records via csdk CLI

## Usage

```bash
csdk api-module list
csdk api-module list --where.<field>.<op> <value> --orderBy <values>
csdk api-module list --limit 10 --after <cursor>
csdk api-module find-first --where.<field>.<op> <value>
csdk api-module get --id <UUID>
csdk api-module create --databaseId <UUID> --apiId <UUID> --name <String> --data <JSON>
csdk api-module update --id <UUID> [--databaseId <UUID>] [--apiId <UUID>] [--name <String>] [--data <JSON>]
csdk api-module delete --id <UUID>
```

## Examples

### List apiModule records

```bash
csdk api-module list
```

### List apiModule records with pagination

```bash
csdk api-module list --limit 10 --offset 0
```

### List apiModule records with cursor pagination

```bash
csdk api-module list --limit 10 --after <cursor>
```

### Find first matching apiModule

```bash
csdk api-module find-first --where.id.equalTo <value>
```

### List apiModule records with field selection

```bash
csdk api-module list --select id,id
```

### List apiModule records with filtering and ordering

```bash
csdk api-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a apiModule

```bash
csdk api-module create --databaseId <UUID> --apiId <UUID> --name <String> --data <JSON>
```

### Get a apiModule by id

```bash
csdk api-module get --id <value>
```
