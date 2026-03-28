# defaultIdsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DefaultIdsModule records via csdk CLI

## Usage

```bash
csdk default-ids-module list
csdk default-ids-module list --where.<field>.<op> <value> --orderBy <values>
csdk default-ids-module list --limit 10 --after <cursor>
csdk default-ids-module find-first --where.<field>.<op> <value>
csdk default-ids-module get --id <UUID>
csdk default-ids-module create --databaseId <UUID>
csdk default-ids-module update --id <UUID> [--databaseId <UUID>]
csdk default-ids-module delete --id <UUID>
```

## Examples

### List defaultIdsModule records

```bash
csdk default-ids-module list
```

### List defaultIdsModule records with pagination

```bash
csdk default-ids-module list --limit 10 --offset 0
```

### List defaultIdsModule records with cursor pagination

```bash
csdk default-ids-module list --limit 10 --after <cursor>
```

### Find first matching defaultIdsModule

```bash
csdk default-ids-module find-first --where.id.equalTo <value>
```

### List defaultIdsModule records with field selection

```bash
csdk default-ids-module list --select id,id
```

### List defaultIdsModule records with filtering and ordering

```bash
csdk default-ids-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a defaultIdsModule

```bash
csdk default-ids-module create --databaseId <UUID>
```

### Get a defaultIdsModule by id

```bash
csdk default-ids-module get --id <value>
```
