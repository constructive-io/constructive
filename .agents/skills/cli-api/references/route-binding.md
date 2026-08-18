# routeBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RouteBinding records via csdk CLI

## Usage

```bash
csdk route-binding list
csdk route-binding list --where.<field>.<op> <value> --orderBy <values>
csdk route-binding list --limit 10 --after <cursor>
csdk route-binding find-first --where.<field>.<op> <value>
csdk route-binding get --id <UUID>
csdk route-binding create --domainId <UUID> --path <String> [--isActive <Boolean>] [--method <String>] [--priority <Int>] [--targetApiId <UUID>] [--targetBucketId <UUID>] [--targetFunctionId <UUID>] [--targetRedirectId <UUID>] [--targetServiceId <UUID>] [--targetSiteId <UUID>]
csdk route-binding update --id <UUID> [--domainId <UUID>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--priority <Int>] [--targetApiId <UUID>] [--targetBucketId <UUID>] [--targetFunctionId <UUID>] [--targetRedirectId <UUID>] [--targetServiceId <UUID>] [--targetSiteId <UUID>]
csdk route-binding delete --id <UUID>
```

## Examples

### List routeBinding records

```bash
csdk route-binding list
```

### List routeBinding records with pagination

```bash
csdk route-binding list --limit 10 --offset 0
```

### List routeBinding records with cursor pagination

```bash
csdk route-binding list --limit 10 --after <cursor>
```

### Find first matching routeBinding

```bash
csdk route-binding find-first --where.id.equalTo <value>
```

### List routeBinding records with field selection

```bash
csdk route-binding list --select id,id
```

### List routeBinding records with filtering and ordering

```bash
csdk route-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a routeBinding

```bash
csdk route-binding create --domainId <UUID> --path <String> [--isActive <Boolean>] [--method <String>] [--priority <Int>] [--targetApiId <UUID>] [--targetBucketId <UUID>] [--targetFunctionId <UUID>] [--targetRedirectId <UUID>] [--targetServiceId <UUID>] [--targetSiteId <UUID>]
```

### Get a routeBinding by id

```bash
csdk route-binding get --id <value>
```
