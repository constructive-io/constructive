# siteErrorPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteErrorPage records via csdk CLI

## Usage

```bash
csdk site-error-page list
csdk site-error-page list --where.<field>.<op> <value> --orderBy <values>
csdk site-error-page list --limit 10 --after <cursor>
csdk site-error-page find-first --where.<field>.<op> <value>
csdk site-error-page get --id <UUID>
csdk site-error-page create --databaseId <UUID> --objectPath <String> --siteId <UUID> --statusCode <Int>
csdk site-error-page update --id <UUID> [--databaseId <UUID>] [--objectPath <String>] [--siteId <UUID>] [--statusCode <Int>]
csdk site-error-page delete --id <UUID>
```

## Examples

### List siteErrorPage records

```bash
csdk site-error-page list
```

### List siteErrorPage records with pagination

```bash
csdk site-error-page list --limit 10 --offset 0
```

### List siteErrorPage records with cursor pagination

```bash
csdk site-error-page list --limit 10 --after <cursor>
```

### Find first matching siteErrorPage

```bash
csdk site-error-page find-first --where.id.equalTo <value>
```

### List siteErrorPage records with field selection

```bash
csdk site-error-page list --select id,id
```

### List siteErrorPage records with filtering and ordering

```bash
csdk site-error-page list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteErrorPage

```bash
csdk site-error-page create --databaseId <UUID> --objectPath <String> --siteId <UUID> --statusCode <Int>
```

### Get a siteErrorPage by id

```bash
csdk site-error-page get --id <value>
```
