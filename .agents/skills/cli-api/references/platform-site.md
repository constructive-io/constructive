# platformSite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSite records via csdk CLI

## Usage

```bash
csdk platform-site list
csdk platform-site list --where.<field>.<op> <value> --orderBy <values>
csdk platform-site list --limit 10 --after <cursor>
csdk platform-site find-first --where.<field>.<op> <value>
csdk platform-site get --id <UUID>
csdk platform-site create --name <String> [--config <JSON>] [--description <String>] [--isPublished <Boolean>] [--title <String>]
csdk platform-site update --id <UUID> [--config <JSON>] [--description <String>] [--isPublished <Boolean>] [--name <String>] [--title <String>]
csdk platform-site delete --id <UUID>
```

## Examples

### List platformSite records

```bash
csdk platform-site list
```

### List platformSite records with pagination

```bash
csdk platform-site list --limit 10 --offset 0
```

### List platformSite records with cursor pagination

```bash
csdk platform-site list --limit 10 --after <cursor>
```

### Find first matching platformSite

```bash
csdk platform-site find-first --where.id.equalTo <value>
```

### List platformSite records with field selection

```bash
csdk platform-site list --select id,id
```

### List platformSite records with filtering and ordering

```bash
csdk platform-site list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSite

```bash
csdk platform-site create --name <String> [--config <JSON>] [--description <String>] [--isPublished <Boolean>] [--title <String>]
```

### Get a platformSite by id

```bash
csdk platform-site get --id <value>
```
