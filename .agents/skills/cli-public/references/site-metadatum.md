# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteMetadatum records via csdk CLI

## Usage

```bash
csdk site-metadatum list
csdk site-metadatum get --id <UUID>
csdk site-metadatum create --databaseId <UUID> --siteId <UUID> [--title <String>] [--description <String>] [--ogImage <Image>]
csdk site-metadatum update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--title <String>] [--description <String>] [--ogImage <Image>]
csdk site-metadatum delete --id <UUID>
```

## Examples

### List all siteMetadatum records

```bash
csdk site-metadatum list
```

### Create a siteMetadatum

```bash
csdk site-metadatum create --databaseId <UUID> --siteId <UUID> [--title <String>] [--description <String>] [--ogImage <Image>]
```

### Get a siteMetadatum by id

```bash
csdk site-metadatum get --id <value>
```
