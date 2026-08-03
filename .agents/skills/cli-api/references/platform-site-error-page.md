# platformSiteErrorPage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteErrorPage records via csdk CLI

## Usage

```bash
csdk platform-site-error-page list
csdk platform-site-error-page list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-error-page list --limit 10 --after <cursor>
csdk platform-site-error-page find-first --where.<field>.<op> <value>
csdk platform-site-error-page get --id <UUID>
csdk platform-site-error-page create --objectPath <String> --siteId <UUID> --statusCode <Int>
csdk platform-site-error-page update --id <UUID> [--objectPath <String>] [--siteId <UUID>] [--statusCode <Int>]
csdk platform-site-error-page delete --id <UUID>
```

## Examples

### List platformSiteErrorPage records

```bash
csdk platform-site-error-page list
```

### List platformSiteErrorPage records with pagination

```bash
csdk platform-site-error-page list --limit 10 --offset 0
```

### List platformSiteErrorPage records with cursor pagination

```bash
csdk platform-site-error-page list --limit 10 --after <cursor>
```

### Find first matching platformSiteErrorPage

```bash
csdk platform-site-error-page find-first --where.id.equalTo <value>
```

### List platformSiteErrorPage records with field selection

```bash
csdk platform-site-error-page list --select id,id
```

### List platformSiteErrorPage records with filtering and ordering

```bash
csdk platform-site-error-page list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteErrorPage

```bash
csdk platform-site-error-page create --objectPath <String> --siteId <UUID> --statusCode <Int>
```

### Get a platformSiteErrorPage by id

```bash
csdk platform-site-error-page get --id <value>
```
