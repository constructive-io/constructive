# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteTheme records via csdk CLI

## Usage

```bash
csdk site-theme list
csdk site-theme list --where.<field>.<op> <value> --orderBy <values>
csdk site-theme list --limit 10 --after <cursor>
csdk site-theme find-first --where.<field>.<op> <value>
csdk site-theme get --id <UUID>
csdk site-theme create --databaseId <UUID> --siteId <UUID> --theme <JSON>
csdk site-theme update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--theme <JSON>]
csdk site-theme delete --id <UUID>
```

## Examples

### List siteTheme records

```bash
csdk site-theme list
```

### List siteTheme records with pagination

```bash
csdk site-theme list --limit 10 --offset 0
```

### List siteTheme records with cursor pagination

```bash
csdk site-theme list --limit 10 --after <cursor>
```

### Find first matching siteTheme

```bash
csdk site-theme find-first --where.id.equalTo <value>
```

### List siteTheme records with field selection

```bash
csdk site-theme list --select id,id
```

### List siteTheme records with filtering and ordering

```bash
csdk site-theme list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteTheme

```bash
csdk site-theme create --databaseId <UUID> --siteId <UUID> --theme <JSON>
```

### Get a siteTheme by id

```bash
csdk site-theme get --id <value>
```
