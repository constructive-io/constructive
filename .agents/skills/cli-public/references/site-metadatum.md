# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteMetadatum records via csdk CLI

## Usage

```bash
csdk site-metadatum list
csdk site-metadatum list --where.<field>.<op> <value> --orderBy <values>
csdk site-metadatum list --limit 10 --after <cursor>
csdk site-metadatum find-first --where.<field>.<op> <value>
csdk site-metadatum get --id <UUID>
csdk site-metadatum create --databaseId <UUID> --siteId <UUID> [--title <String>] [--description <String>] [--ogImage <Image>]
csdk site-metadatum update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--title <String>] [--description <String>] [--ogImage <Image>]
csdk site-metadatum delete --id <UUID>
```

## Examples

### List siteMetadatum records

```bash
csdk site-metadatum list
```

### List siteMetadatum records with pagination

```bash
csdk site-metadatum list --limit 10 --offset 0
```

### List siteMetadatum records with cursor pagination

```bash
csdk site-metadatum list --limit 10 --after <cursor>
```

### Find first matching siteMetadatum

```bash
csdk site-metadatum find-first --where.id.equalTo <value>
```

### List siteMetadatum records with field selection

```bash
csdk site-metadatum list --select id,id
```

### List siteMetadatum records with filtering and ordering

```bash
csdk site-metadatum list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteMetadatum

```bash
csdk site-metadatum create --databaseId <UUID> --siteId <UUID> [--title <String>] [--description <String>] [--ogImage <Image>]
```

### Get a siteMetadatum by id

```bash
csdk site-metadatum get --id <value>
```
