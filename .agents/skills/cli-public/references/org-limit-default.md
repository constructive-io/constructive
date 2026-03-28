# orgLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimitDefault records via csdk CLI

## Usage

```bash
csdk org-limit-default list
csdk org-limit-default list --where.<field>.<op> <value> --orderBy <values>
csdk org-limit-default list --limit 10 --after <cursor>
csdk org-limit-default find-first --where.<field>.<op> <value>
csdk org-limit-default get --id <UUID>
csdk org-limit-default create --name <String> [--max <Int>]
csdk org-limit-default update --id <UUID> [--name <String>] [--max <Int>]
csdk org-limit-default delete --id <UUID>
```

## Examples

### List orgLimitDefault records

```bash
csdk org-limit-default list
```

### List orgLimitDefault records with pagination

```bash
csdk org-limit-default list --limit 10 --offset 0
```

### List orgLimitDefault records with cursor pagination

```bash
csdk org-limit-default list --limit 10 --after <cursor>
```

### Find first matching orgLimitDefault

```bash
csdk org-limit-default find-first --where.id.equalTo <value>
```

### List orgLimitDefault records with field selection

```bash
csdk org-limit-default list --select id,id
```

### List orgLimitDefault records with filtering and ordering

```bash
csdk org-limit-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgLimitDefault

```bash
csdk org-limit-default create --name <String> [--max <Int>]
```

### Get a orgLimitDefault by id

```bash
csdk org-limit-default get --id <value>
```
