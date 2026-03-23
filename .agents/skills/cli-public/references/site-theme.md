# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteTheme records via csdk CLI

## Usage

```bash
csdk site-theme list
csdk site-theme get --id <UUID>
csdk site-theme create --databaseId <UUID> --siteId <UUID> --theme <JSON>
csdk site-theme update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--theme <JSON>]
csdk site-theme delete --id <UUID>
```

## Examples

### List all siteTheme records

```bash
csdk site-theme list
```

### Create a siteTheme

```bash
csdk site-theme create --databaseId <UUID> --siteId <UUID> --theme <JSON>
```

### Get a siteTheme by id

```bash
csdk site-theme get --id <value>
```
