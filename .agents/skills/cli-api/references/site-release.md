# siteRelease

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteRelease records via csdk CLI

## Usage

```bash
csdk site-release list
csdk site-release list --where.<field>.<op> <value> --orderBy <values>
csdk site-release list --limit 10 --after <cursor>
csdk site-release find-first --where.<field>.<op> <value>
csdk site-release get --id <UUID>
csdk site-release create --databaseId <UUID> --manifest <JSON> --siteId <UUID> [--commitId <UUID>] [--storeId <UUID>]
csdk site-release update --id <UUID> [--commitId <UUID>] [--databaseId <UUID>] [--manifest <JSON>] [--siteId <UUID>] [--storeId <UUID>]
csdk site-release delete --id <UUID>
```

## Examples

### List siteRelease records

```bash
csdk site-release list
```

### List siteRelease records with pagination

```bash
csdk site-release list --limit 10 --offset 0
```

### List siteRelease records with cursor pagination

```bash
csdk site-release list --limit 10 --after <cursor>
```

### Find first matching siteRelease

```bash
csdk site-release find-first --where.id.equalTo <value>
```

### List siteRelease records with field selection

```bash
csdk site-release list --select id,id
```

### List siteRelease records with filtering and ordering

```bash
csdk site-release list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteRelease

```bash
csdk site-release create --databaseId <UUID> --manifest <JSON> --siteId <UUID> [--commitId <UUID>] [--storeId <UUID>]
```

### Get a siteRelease by id

```bash
csdk site-release get --id <value>
```
