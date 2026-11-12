# platformReservedSubdomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformReservedSubdomain records via csdk CLI

## Usage

```bash
csdk platform-reserved-subdomain list
csdk platform-reserved-subdomain list --where.<field>.<op> <value> --orderBy <values>
csdk platform-reserved-subdomain list --limit 10 --after <cursor>
csdk platform-reserved-subdomain find-first --where.<field>.<op> <value>
csdk platform-reserved-subdomain get --id <UUID>
csdk platform-reserved-subdomain create --label <String> [--createdByPrincipal <UUID>] [--match <String>] [--reason <String>] [--updatedByPrincipal <UUID>]
csdk platform-reserved-subdomain update --id <UUID> [--createdByPrincipal <UUID>] [--label <String>] [--match <String>] [--reason <String>] [--updatedByPrincipal <UUID>]
csdk platform-reserved-subdomain delete --id <UUID>
```

## Examples

### List platformReservedSubdomain records

```bash
csdk platform-reserved-subdomain list
```

### List platformReservedSubdomain records with pagination

```bash
csdk platform-reserved-subdomain list --limit 10 --offset 0
```

### List platformReservedSubdomain records with cursor pagination

```bash
csdk platform-reserved-subdomain list --limit 10 --after <cursor>
```

### Find first matching platformReservedSubdomain

```bash
csdk platform-reserved-subdomain find-first --where.id.equalTo <value>
```

### List platformReservedSubdomain records with field selection

```bash
csdk platform-reserved-subdomain list --select id,id
```

### List platformReservedSubdomain records with filtering and ordering

```bash
csdk platform-reserved-subdomain list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformReservedSubdomain

```bash
csdk platform-reserved-subdomain create --label <String> [--createdByPrincipal <UUID>] [--match <String>] [--reason <String>] [--updatedByPrincipal <UUID>]
```

### Get a platformReservedSubdomain by id

```bash
csdk platform-reserved-subdomain get --id <value>
```
