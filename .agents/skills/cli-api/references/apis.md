# apis

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Apis records via csdk CLI

## Usage

```bash
csdk apis list
csdk apis list --where.<field>.<op> <value> --orderBy <values>
csdk apis list --limit 10 --after <cursor>
csdk apis find-first --where.<field>.<op> <value>
csdk apis get --id <UUID>
csdk apis create --databaseId <UUID> --name <String> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--roleName <String>]
csdk apis update --id <UUID> [--anonRole <String>] [--config <JSON>] [--databaseId <UUID>] [--dbname <String>] [--isPublished <Boolean>] [--name <String>] [--roleName <String>]
csdk apis delete --id <UUID>
```

## Examples

### List apis records

```bash
csdk apis list
```

### List apis records with pagination

```bash
csdk apis list --limit 10 --offset 0
```

### List apis records with cursor pagination

```bash
csdk apis list --limit 10 --after <cursor>
```

### Find first matching apis

```bash
csdk apis find-first --where.id.equalTo <value>
```

### List apis records with field selection

```bash
csdk apis list --select id,id
```

### List apis records with filtering and ordering

```bash
csdk apis list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a apis

```bash
csdk apis create --databaseId <UUID> --name <String> [--anonRole <String>] [--config <JSON>] [--dbname <String>] [--isPublished <Boolean>] [--roleName <String>]
```

### Get a apis by id

```bash
csdk apis get --id <value>
```
