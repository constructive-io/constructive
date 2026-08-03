# platformSiteWebConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteWebConfig records via csdk CLI

## Usage

```bash
csdk platform-site-web-config list
csdk platform-site-web-config list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-web-config list --limit 10 --after <cursor>
csdk platform-site-web-config find-first --where.<field>.<op> <value>
csdk platform-site-web-config get --id <UUID>
csdk platform-site-web-config create --siteId <UUID> [--cleanUrls <Boolean>] [--indexDocument <String>] [--metadata <JSON>] [--spaFallback <Boolean>]
csdk platform-site-web-config update --id <UUID> [--cleanUrls <Boolean>] [--indexDocument <String>] [--metadata <JSON>] [--siteId <UUID>] [--spaFallback <Boolean>]
csdk platform-site-web-config delete --id <UUID>
```

## Examples

### List platformSiteWebConfig records

```bash
csdk platform-site-web-config list
```

### List platformSiteWebConfig records with pagination

```bash
csdk platform-site-web-config list --limit 10 --offset 0
```

### List platformSiteWebConfig records with cursor pagination

```bash
csdk platform-site-web-config list --limit 10 --after <cursor>
```

### Find first matching platformSiteWebConfig

```bash
csdk platform-site-web-config find-first --where.id.equalTo <value>
```

### List platformSiteWebConfig records with field selection

```bash
csdk platform-site-web-config list --select id,id
```

### List platformSiteWebConfig records with filtering and ordering

```bash
csdk platform-site-web-config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteWebConfig

```bash
csdk platform-site-web-config create --siteId <UUID> [--cleanUrls <Boolean>] [--indexDocument <String>] [--metadata <JSON>] [--spaFallback <Boolean>]
```

### Get a platformSiteWebConfig by id

```bash
csdk platform-site-web-config get --id <value>
```
