# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Api records via csdk CLI

## Usage

```bash
csdk api list
csdk api list --where.<field>.<op> <value> --orderBy <values>
csdk api list --limit 10 --after <cursor>
csdk api find-first --where.<field>.<op> <value>
csdk api get --id <UUID>
csdk api create --databaseId <UUID> --name <String> [--dbname <String>] [--roleName <String>] [--anonRole <String>] [--isPublic <Boolean>]
csdk api update --id <UUID> [--databaseId <UUID>] [--name <String>] [--dbname <String>] [--roleName <String>] [--anonRole <String>] [--isPublic <Boolean>]
csdk api delete --id <UUID>
```

## Examples

### List api records

```bash
csdk api list
```

### List api records with pagination

```bash
csdk api list --limit 10 --offset 0
```

### List api records with cursor pagination

```bash
csdk api list --limit 10 --after <cursor>
```

### Find first matching api

```bash
csdk api find-first --where.id.equalTo <value>
```

### List api records with field selection

```bash
csdk api list --select id,id
```

### List api records with filtering and ordering

```bash
csdk api list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a api

```bash
csdk api create --databaseId <UUID> --name <String> [--dbname <String>] [--roleName <String>] [--anonRole <String>] [--isPublic <Boolean>]
```

### Get a api by id

```bash
csdk api get --id <value>
```
