# platformSiteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSiteModule records via csdk CLI

## Usage

```bash
csdk platform-site-module list
csdk platform-site-module list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site-module list --limit 10 --after <cursor>
csdk platform-site-module find-first --where.<field>.<op> <value>
csdk platform-site-module get --id <UUID>
csdk platform-site-module create --data <JSON> --name <String> --siteId <UUID>
csdk platform-site-module update --id <UUID> [--data <JSON>] [--name <String>] [--siteId <UUID>]
csdk platform-site-module delete --id <UUID>
```

## Examples

### List platformSiteModule records

```bash
csdk platform-site-module list
```

### List platformSiteModule records with pagination

```bash
csdk platform-site-module list --limit 10 --offset 0
```

### List platformSiteModule records with cursor pagination

```bash
csdk platform-site-module list --limit 10 --after <cursor>
```

### Find first matching platformSiteModule

```bash
csdk platform-site-module find-first --where.id.equalTo <value>
```

### List platformSiteModule records with field selection

```bash
csdk platform-site-module list --select id,id
```

### List platformSiteModule records with filtering and ordering

```bash
csdk platform-site-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSiteModule

```bash
csdk platform-site-module create --data <JSON> --name <String> --siteId <UUID>
```

### Get a platformSiteModule by id

```bash
csdk platform-site-module get --id <value>
```
