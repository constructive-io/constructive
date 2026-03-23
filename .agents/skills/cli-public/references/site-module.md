# siteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteModule records via csdk CLI

## Usage

```bash
csdk site-module list
csdk site-module get --id <UUID>
csdk site-module create --databaseId <UUID> --siteId <UUID> --name <String> --data <JSON>
csdk site-module update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--name <String>] [--data <JSON>]
csdk site-module delete --id <UUID>
```

## Examples

### List all siteModule records

```bash
csdk site-module list
```

### Create a siteModule

```bash
csdk site-module create --databaseId <UUID> --siteId <UUID> --name <String> --data <JSON>
```

### Get a siteModule by id

```bash
csdk site-module get --id <value>
```
