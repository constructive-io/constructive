# route

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Route records via csdk CLI

## Usage

```bash
csdk route list
csdk route list --where.<field>.<op> <value> --orderBy <values>
csdk route list --limit 10 --after <cursor>
csdk route find-first --where.<field>.<op> <value>
csdk route get --id <UUID>
csdk route create --databaseId <UUID> --domainId <UUID> [--anonymous <Boolean>] [--config <JSON>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--previewRef <String>] [--priority <Int>] [--servingSiteId <UUID>] [--targetApiId <UUID>] [--targetBucketId <UUID>] [--targetFunctionId <UUID>] [--targetRedirectId <UUID>] [--targetServiceId <UUID>] [--targetSiteId <UUID>]
csdk route update --id <UUID> [--anonymous <Boolean>] [--config <JSON>] [--databaseId <UUID>] [--domainId <UUID>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--previewRef <String>] [--priority <Int>] [--servingSiteId <UUID>] [--targetApiId <UUID>] [--targetBucketId <UUID>] [--targetFunctionId <UUID>] [--targetRedirectId <UUID>] [--targetServiceId <UUID>] [--targetSiteId <UUID>]
csdk route delete --id <UUID>
```

## Examples

### List route records

```bash
csdk route list
```

### List route records with pagination

```bash
csdk route list --limit 10 --offset 0
```

### List route records with cursor pagination

```bash
csdk route list --limit 10 --after <cursor>
```

### Find first matching route

```bash
csdk route find-first --where.id.equalTo <value>
```

### List route records with field selection

```bash
csdk route list --select id,id
```

### List route records with filtering and ordering

```bash
csdk route list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a route

```bash
csdk route create --databaseId <UUID> --domainId <UUID> [--anonymous <Boolean>] [--config <JSON>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--previewRef <String>] [--priority <Int>] [--servingSiteId <UUID>] [--targetApiId <UUID>] [--targetBucketId <UUID>] [--targetFunctionId <UUID>] [--targetRedirectId <UUID>] [--targetServiceId <UUID>] [--targetSiteId <UUID>]
```

### Get a route by id

```bash
csdk route get --id <value>
```
