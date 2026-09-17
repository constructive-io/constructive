# platformGetSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformGetSitePreviewsRecord records via csdk CLI

## Usage

```bash
csdk platform-get-site-previews-record list
csdk platform-get-site-previews-record list --where.<field>.<op> <value> --orderBy <values>
csdk platform-get-site-previews-record list --limit 10 --after <cursor>
csdk platform-get-site-previews-record find-first --where.<field>.<op> <value>
csdk platform-get-site-previews-record get --id <UUID>
csdk platform-get-site-previews-record create --commitId <UUID> --name <String>
csdk platform-get-site-previews-record update --id <UUID> [--commitId <UUID>] [--name <String>]
csdk platform-get-site-previews-record delete --id <UUID>
```

## Examples

### List platformGetSitePreviewsRecord records

```bash
csdk platform-get-site-previews-record list
```

### List platformGetSitePreviewsRecord records with pagination

```bash
csdk platform-get-site-previews-record list --limit 10 --offset 0
```

### List platformGetSitePreviewsRecord records with cursor pagination

```bash
csdk platform-get-site-previews-record list --limit 10 --after <cursor>
```

### Find first matching platformGetSitePreviewsRecord

```bash
csdk platform-get-site-previews-record find-first --where.id.equalTo <value>
```

### List platformGetSitePreviewsRecord records with field selection

```bash
csdk platform-get-site-previews-record list --select id,id
```

### List platformGetSitePreviewsRecord records with filtering and ordering

```bash
csdk platform-get-site-previews-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformGetSitePreviewsRecord

```bash
csdk platform-get-site-previews-record create --commitId <UUID> --name <String>
```

### Get a platformGetSitePreviewsRecord by id

```bash
csdk platform-get-site-previews-record get --id <value>
```
