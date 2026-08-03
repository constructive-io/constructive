# platformSiteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteTheme records via csdk CLI

## Usage

```bash
csdk platform-site-theme list
csdk platform-site-theme list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-theme list --limit 10 --after <cursor>
csdk platform-site-theme find-first --where.<field>.<op> <value>
csdk platform-site-theme get --id <UUID>
csdk platform-site-theme create --siteId <UUID> --theme <JSON> [--commitId <UUID>] [--isActive <Boolean>] [--name <String>] [--storeId <UUID>]
csdk platform-site-theme update --id <UUID> [--commitId <UUID>] [--isActive <Boolean>] [--name <String>] [--siteId <UUID>] [--storeId <UUID>] [--theme <JSON>]
csdk platform-site-theme delete --id <UUID>
```

## Examples

### List platformSiteTheme records

```bash
csdk platform-site-theme list
```

### List platformSiteTheme records with pagination

```bash
csdk platform-site-theme list --limit 10 --offset 0
```

### List platformSiteTheme records with cursor pagination

```bash
csdk platform-site-theme list --limit 10 --after <cursor>
```

### Find first matching platformSiteTheme

```bash
csdk platform-site-theme find-first --where.id.equalTo <value>
```

### List platformSiteTheme records with field selection

```bash
csdk platform-site-theme list --select id,id
```

### List platformSiteTheme records with filtering and ordering

```bash
csdk platform-site-theme list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteTheme

```bash
csdk platform-site-theme create --siteId <UUID> --theme <JSON> [--commitId <UUID>] [--isActive <Boolean>] [--name <String>] [--storeId <UUID>]
```

### Get a platformSiteTheme by id

```bash
csdk platform-site-theme get --id <value>
```
