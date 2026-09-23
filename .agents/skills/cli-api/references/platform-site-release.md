# platformSiteRelease

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteRelease records via csdk CLI

## Usage

```bash
csdk platform-site-release list
csdk platform-site-release list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-release list --limit 10 --after <cursor>
csdk platform-site-release find-first --where.<field>.<op> <value>
csdk platform-site-release get --id <UUID>
csdk platform-site-release create --manifest <JSON> --siteId <UUID> [--commitId <UUID>] [--storeId <UUID>]
csdk platform-site-release update --id <UUID> [--commitId <UUID>] [--manifest <JSON>] [--siteId <UUID>] [--storeId <UUID>]
csdk platform-site-release delete --id <UUID>
```

## Examples

### List platformSiteRelease records

```bash
csdk platform-site-release list
```

### List platformSiteRelease records with pagination

```bash
csdk platform-site-release list --limit 10 --offset 0
```

### List platformSiteRelease records with cursor pagination

```bash
csdk platform-site-release list --limit 10 --after <cursor>
```

### Find first matching platformSiteRelease

```bash
csdk platform-site-release find-first --where.id.equalTo <value>
```

### List platformSiteRelease records with field selection

```bash
csdk platform-site-release list --select id,id
```

### List platformSiteRelease records with filtering and ordering

```bash
csdk platform-site-release list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteRelease

```bash
csdk platform-site-release create --manifest <JSON> --siteId <UUID> [--commitId <UUID>] [--storeId <UUID>]
```

### Get a platformSiteRelease by id

```bash
csdk platform-site-release get --id <value>
```
