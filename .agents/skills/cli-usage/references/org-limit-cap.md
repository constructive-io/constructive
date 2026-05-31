# orgLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimitCap records via csdk CLI

## Usage

```bash
csdk org-limit-cap list
csdk org-limit-cap list --where.<field>.<op> <value> --orderBy <values>
csdk org-limit-cap list --limit 10 --after <cursor>
csdk org-limit-cap find-first --where.<field>.<op> <value>
csdk org-limit-cap get --id <UUID>
csdk org-limit-cap create --name <String> --entityId <UUID> [--max <BigInt>]
csdk org-limit-cap update --id <UUID> [--name <String>] [--entityId <UUID>] [--max <BigInt>]
csdk org-limit-cap delete --id <UUID>
```

## Examples

### List orgLimitCap records

```bash
csdk org-limit-cap list
```

### List orgLimitCap records with pagination

```bash
csdk org-limit-cap list --limit 10 --offset 0
```

### List orgLimitCap records with cursor pagination

```bash
csdk org-limit-cap list --limit 10 --after <cursor>
```

### Find first matching orgLimitCap

```bash
csdk org-limit-cap find-first --where.id.equalTo <value>
```

### List orgLimitCap records with field selection

```bash
csdk org-limit-cap list --select id,id
```

### List orgLimitCap records with filtering and ordering

```bash
csdk org-limit-cap list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgLimitCap

```bash
csdk org-limit-cap create --name <String> --entityId <UUID> [--max <BigInt>]
```

### Get a orgLimitCap by id

```bash
csdk org-limit-cap get --id <value>
```
