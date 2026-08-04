# platformPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformPage records via csdk CLI

## Usage

```bash
csdk platform-page list
csdk platform-page list --where.<field>.<op> <value> --orderBy <values>
csdk platform-page list --limit 10 --after <cursor>
csdk platform-page find-first --where.<field>.<op> <value>
csdk platform-page get --id <UUID>
csdk platform-page create --content <JSON> --siteId <UUID> --slug <String> [--commitId <UUID>] [--storeId <UUID>]
csdk platform-page update --id <UUID> [--commitId <UUID>] [--content <JSON>] [--siteId <UUID>] [--slug <String>] [--storeId <UUID>]
csdk platform-page delete --id <UUID>
```

## Examples

### List platformPage records

```bash
csdk platform-page list
```

### List platformPage records with pagination

```bash
csdk platform-page list --limit 10 --offset 0
```

### List platformPage records with cursor pagination

```bash
csdk platform-page list --limit 10 --after <cursor>
```

### Find first matching platformPage

```bash
csdk platform-page find-first --where.id.equalTo <value>
```

### List platformPage records with field selection

```bash
csdk platform-page list --select id,id
```

### List platformPage records with filtering and ordering

```bash
csdk platform-page list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformPage

```bash
csdk platform-page create --content <JSON> --siteId <UUID> --slug <String> [--commitId <UUID>] [--storeId <UUID>]
```

### Get a platformPage by id

```bash
csdk platform-page get --id <value>
```
