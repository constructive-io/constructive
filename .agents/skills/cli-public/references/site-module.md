# siteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteModule records via csdk CLI

## Usage

```bash
csdk site-module list
csdk site-module list --where.<field>.<op> <value> --orderBy <values>
csdk site-module list --limit 10 --after <cursor>
csdk site-module find-first --where.<field>.<op> <value>
csdk site-module get --id <UUID>
csdk site-module create --databaseId <UUID> --siteId <UUID> --name <String> --data <JSON>
csdk site-module update --id <UUID> [--databaseId <UUID>] [--siteId <UUID>] [--name <String>] [--data <JSON>]
csdk site-module delete --id <UUID>
```

## Examples

### List siteModule records

```bash
csdk site-module list
```

### List siteModule records with pagination

```bash
csdk site-module list --limit 10 --offset 0
```

### List siteModule records with cursor pagination

```bash
csdk site-module list --limit 10 --after <cursor>
```

### Find first matching siteModule

```bash
csdk site-module find-first --where.id.equalTo <value>
```

### List siteModule records with field selection

```bash
csdk site-module list --select id,id
```

### List siteModule records with filtering and ordering

```bash
csdk site-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteModule

```bash
csdk site-module create --databaseId <UUID> --siteId <UUID> --name <String> --data <JSON>
```

### Get a siteModule by id

```bash
csdk site-module get --id <value>
```
