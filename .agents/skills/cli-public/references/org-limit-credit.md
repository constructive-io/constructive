# orgLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimitCredit records via csdk CLI

## Usage

```bash
csdk org-limit-credit list
csdk org-limit-credit list --where.<field>.<op> <value> --orderBy <values>
csdk org-limit-credit list --limit 10 --after <cursor>
csdk org-limit-credit find-first --where.<field>.<op> <value>
csdk org-limit-credit get --id <UUID>
csdk org-limit-credit create --defaultLimitId <UUID> --amount <BigInt> [--actorId <UUID>] [--entityId <UUID>] [--creditType <String>] [--reason <String>]
csdk org-limit-credit update --id <UUID> [--defaultLimitId <UUID>] [--actorId <UUID>] [--entityId <UUID>] [--amount <BigInt>] [--creditType <String>] [--reason <String>]
csdk org-limit-credit delete --id <UUID>
```

## Examples

### List orgLimitCredit records

```bash
csdk org-limit-credit list
```

### List orgLimitCredit records with pagination

```bash
csdk org-limit-credit list --limit 10 --offset 0
```

### List orgLimitCredit records with cursor pagination

```bash
csdk org-limit-credit list --limit 10 --after <cursor>
```

### Find first matching orgLimitCredit

```bash
csdk org-limit-credit find-first --where.id.equalTo <value>
```

### List orgLimitCredit records with field selection

```bash
csdk org-limit-credit list --select id,id
```

### List orgLimitCredit records with filtering and ordering

```bash
csdk org-limit-credit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgLimitCredit

```bash
csdk org-limit-credit create --defaultLimitId <UUID> --amount <BigInt> [--actorId <UUID>] [--entityId <UUID>] [--creditType <String>] [--reason <String>]
```

### Get a orgLimitCredit by id

```bash
csdk org-limit-credit get --id <value>
```
