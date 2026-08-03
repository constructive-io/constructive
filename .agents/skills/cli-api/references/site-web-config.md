# siteWebConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteWebConfig records via csdk CLI

## Usage

```bash
csdk site-web-config list
csdk site-web-config list --where.<field>.<op> <value> --orderBy <values>
csdk site-web-config list --limit 10 --after <cursor>
csdk site-web-config find-first --where.<field>.<op> <value>
csdk site-web-config get --id <UUID>
csdk site-web-config create --databaseId <UUID> --siteId <UUID> [--cleanUrls <Boolean>] [--indexDocument <String>] [--metadata <JSON>] [--spaFallback <Boolean>]
csdk site-web-config update --id <UUID> [--cleanUrls <Boolean>] [--databaseId <UUID>] [--indexDocument <String>] [--metadata <JSON>] [--siteId <UUID>] [--spaFallback <Boolean>]
csdk site-web-config delete --id <UUID>
```

## Examples

### List siteWebConfig records

```bash
csdk site-web-config list
```

### List siteWebConfig records with pagination

```bash
csdk site-web-config list --limit 10 --offset 0
```

### List siteWebConfig records with cursor pagination

```bash
csdk site-web-config list --limit 10 --after <cursor>
```

### Find first matching siteWebConfig

```bash
csdk site-web-config find-first --where.id.equalTo <value>
```

### List siteWebConfig records with field selection

```bash
csdk site-web-config list --select id,id
```

### List siteWebConfig records with filtering and ordering

```bash
csdk site-web-config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteWebConfig

```bash
csdk site-web-config create --databaseId <UUID> --siteId <UUID> [--cleanUrls <Boolean>] [--indexDocument <String>] [--metadata <JSON>] [--spaFallback <Boolean>]
```

### Get a siteWebConfig by id

```bash
csdk site-web-config get --id <value>
```
