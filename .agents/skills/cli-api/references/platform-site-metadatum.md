# platformSiteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteMetadatum records via csdk CLI

## Usage

```bash
csdk platform-site-metadatum list
csdk platform-site-metadatum list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-metadatum list --limit 10 --after <cursor>
csdk platform-site-metadatum find-first --where.<field>.<op> <value>
csdk platform-site-metadatum get --id <UUID>
csdk platform-site-metadatum create --siteId <UUID> [--description <String>] [--ogImage <Image>] [--title <String>]
csdk platform-site-metadatum update --id <UUID> [--description <String>] [--ogImage <Image>] [--siteId <UUID>] [--title <String>]
csdk platform-site-metadatum delete --id <UUID>
```

## Examples

### List platformSiteMetadatum records

```bash
csdk platform-site-metadatum list
```

### List platformSiteMetadatum records with pagination

```bash
csdk platform-site-metadatum list --limit 10 --offset 0
```

### List platformSiteMetadatum records with cursor pagination

```bash
csdk platform-site-metadatum list --limit 10 --after <cursor>
```

### Find first matching platformSiteMetadatum

```bash
csdk platform-site-metadatum find-first --where.id.equalTo <value>
```

### List platformSiteMetadatum records with field selection

```bash
csdk platform-site-metadatum list --select id,id
```

### List platformSiteMetadatum records with filtering and ordering

```bash
csdk platform-site-metadatum list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteMetadatum

```bash
csdk platform-site-metadatum create --siteId <UUID> [--description <String>] [--ogImage <Image>] [--title <String>]
```

### Get a platformSiteMetadatum by id

```bash
csdk platform-site-metadatum get --id <value>
```
