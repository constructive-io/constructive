# siteDeepLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteDeepLink records via csdk CLI

## Usage

```bash
csdk site-deep-link list
csdk site-deep-link list --where.<field>.<op> <value> --orderBy <values>
csdk site-deep-link list --limit 10 --after <cursor>
csdk site-deep-link find-first --where.<field>.<op> <value>
csdk site-deep-link get --id <UUID>
csdk site-deep-link create --appPath <String> --databaseId <UUID> --siteId <UUID> --slug <String> [--fallbackUrl <String>] [--metadata <JSON>] [--webPath <String>]
csdk site-deep-link update --id <UUID> [--appPath <String>] [--databaseId <UUID>] [--fallbackUrl <String>] [--metadata <JSON>] [--siteId <UUID>] [--slug <String>] [--webPath <String>]
csdk site-deep-link delete --id <UUID>
```

## Examples

### List siteDeepLink records

```bash
csdk site-deep-link list
```

### List siteDeepLink records with pagination

```bash
csdk site-deep-link list --limit 10 --offset 0
```

### List siteDeepLink records with cursor pagination

```bash
csdk site-deep-link list --limit 10 --after <cursor>
```

### Find first matching siteDeepLink

```bash
csdk site-deep-link find-first --where.id.equalTo <value>
```

### List siteDeepLink records with field selection

```bash
csdk site-deep-link list --select id,id
```

### List siteDeepLink records with filtering and ordering

```bash
csdk site-deep-link list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteDeepLink

```bash
csdk site-deep-link create --appPath <String> --databaseId <UUID> --siteId <UUID> --slug <String> [--fallbackUrl <String>] [--metadata <JSON>] [--webPath <String>]
```

### Get a siteDeepLink by id

```bash
csdk site-deep-link get --id <value>
```
