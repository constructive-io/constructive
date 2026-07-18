# httpRoute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for HttpRoute records via csdk CLI

## Usage

```bash
csdk http-route list
csdk http-route list --where.<field>.<op> <value> --orderBy <values>
csdk http-route list --limit 10 --after <cursor>
csdk http-route find-first --where.<field>.<op> <value>
csdk http-route get --id <UUID>
csdk http-route create --databaseId <UUID> --domainId <UUID> --targetId <UUID> --targetKind <String> [--createdBy <UUID>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--priority <Int>] [--updatedBy <UUID>]
csdk http-route update --id <UUID> [--createdBy <UUID>] [--databaseId <UUID>] [--domainId <UUID>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--priority <Int>] [--targetId <UUID>] [--targetKind <String>] [--updatedBy <UUID>]
csdk http-route delete --id <UUID>
```

## Examples

### List httpRoute records

```bash
csdk http-route list
```

### List httpRoute records with pagination

```bash
csdk http-route list --limit 10 --offset 0
```

### List httpRoute records with cursor pagination

```bash
csdk http-route list --limit 10 --after <cursor>
```

### Find first matching httpRoute

```bash
csdk http-route find-first --where.id.equalTo <value>
```

### List httpRoute records with field selection

```bash
csdk http-route list --select id,id
```

### List httpRoute records with filtering and ordering

```bash
csdk http-route list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a httpRoute

```bash
csdk http-route create --databaseId <UUID> --domainId <UUID> --targetId <UUID> --targetKind <String> [--createdBy <UUID>] [--isActive <Boolean>] [--method <String>] [--path <String>] [--priority <Int>] [--updatedBy <UUID>]
```

### Get a httpRoute by id

```bash
csdk http-route get --id <value>
```
