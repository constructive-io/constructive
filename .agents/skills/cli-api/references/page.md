# page

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Page records via csdk CLI

## Usage

```bash
csdk page list
csdk page list --where.<field>.<op> <value> --orderBy <values>
csdk page list --limit 10 --after <cursor>
csdk page find-first --where.<field>.<op> <value>
csdk page get --id <UUID>
csdk page create --content <JSON> --databaseId <UUID> --siteId <UUID> --slug <String> [--commitId <UUID>] [--seededFrom <JSON>] [--storeId <UUID>]
csdk page update --id <UUID> [--commitId <UUID>] [--content <JSON>] [--databaseId <UUID>] [--seededFrom <JSON>] [--siteId <UUID>] [--slug <String>] [--storeId <UUID>]
csdk page delete --id <UUID>
```

## Examples

### List page records

```bash
csdk page list
```

### List page records with pagination

```bash
csdk page list --limit 10 --offset 0
```

### List page records with cursor pagination

```bash
csdk page list --limit 10 --after <cursor>
```

### Find first matching page

```bash
csdk page find-first --where.id.equalTo <value>
```

### List page records with field selection

```bash
csdk page list --select id,id
```

### List page records with filtering and ordering

```bash
csdk page list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a page

```bash
csdk page create --content <JSON> --databaseId <UUID> --siteId <UUID> --slug <String> [--commitId <UUID>] [--seededFrom <JSON>] [--storeId <UUID>]
```

### Get a page by id

```bash
csdk page get --id <value>
```
