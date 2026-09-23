# getSitePreviewsRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for GetSitePreviewsRecord records via csdk CLI

## Usage

```bash
csdk get-site-previews-record list
csdk get-site-previews-record list --where.<field>.<op> <value> --orderBy <values>
csdk get-site-previews-record list --limit 10 --after <cursor>
csdk get-site-previews-record find-first --where.<field>.<op> <value>
csdk get-site-previews-record get --id <UUID>
csdk get-site-previews-record create --commitId <UUID> --name <String>
csdk get-site-previews-record update --id <UUID> [--commitId <UUID>] [--name <String>]
csdk get-site-previews-record delete --id <UUID>
```

## Examples

### List getSitePreviewsRecord records

```bash
csdk get-site-previews-record list
```

### List getSitePreviewsRecord records with pagination

```bash
csdk get-site-previews-record list --limit 10 --offset 0
```

### List getSitePreviewsRecord records with cursor pagination

```bash
csdk get-site-previews-record list --limit 10 --after <cursor>
```

### Find first matching getSitePreviewsRecord

```bash
csdk get-site-previews-record find-first --where.id.equalTo <value>
```

### List getSitePreviewsRecord records with field selection

```bash
csdk get-site-previews-record list --select id,id
```

### List getSitePreviewsRecord records with filtering and ordering

```bash
csdk get-site-previews-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a getSitePreviewsRecord

```bash
csdk get-site-previews-record create --commitId <UUID> --name <String>
```

### Get a getSitePreviewsRecord by id

```bash
csdk get-site-previews-record get --id <value>
```
