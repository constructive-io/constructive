# platformApiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformApiModule records via csdk CLI

## Usage

```bash
csdk platform-api-module list
csdk platform-api-module list --where.<field>.<op> <value> --orderBy <values>
csdk platform-api-module list --limit 10 --after <cursor>
csdk platform-api-module find-first --where.<field>.<op> <value>
csdk platform-api-module get --id <UUID>
csdk platform-api-module create --apiId <UUID> --data <JSON> --name <String>
csdk platform-api-module update --id <UUID> [--apiId <UUID>] [--data <JSON>] [--name <String>]
csdk platform-api-module delete --id <UUID>
```

## Examples

### List platformApiModule records

```bash
csdk platform-api-module list
```

### List platformApiModule records with pagination

```bash
csdk platform-api-module list --limit 10 --offset 0
```

### List platformApiModule records with cursor pagination

```bash
csdk platform-api-module list --limit 10 --after <cursor>
```

### Find first matching platformApiModule

```bash
csdk platform-api-module find-first --where.id.equalTo <value>
```

### List platformApiModule records with field selection

```bash
csdk platform-api-module list --select id,id
```

### List platformApiModule records with filtering and ordering

```bash
csdk platform-api-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformApiModule

```bash
csdk platform-api-module create --apiId <UUID> --data <JSON> --name <String>
```

### Get a platformApiModule by id

```bash
csdk platform-api-module get --id <value>
```
