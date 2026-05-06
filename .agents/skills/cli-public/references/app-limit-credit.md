# appLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitCredit records via csdk CLI

## Usage

```bash
csdk app-limit-credit list
csdk app-limit-credit list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-credit list --limit 10 --after <cursor>
csdk app-limit-credit find-first --where.<field>.<op> <value>
csdk app-limit-credit get --id <UUID>
csdk app-limit-credit create --defaultLimitId <UUID> --amount <BigInt> [--actorId <UUID>] [--creditType <String>] [--reason <String>]
csdk app-limit-credit update --id <UUID> [--defaultLimitId <UUID>] [--actorId <UUID>] [--amount <BigInt>] [--creditType <String>] [--reason <String>]
csdk app-limit-credit delete --id <UUID>
```

## Examples

### List appLimitCredit records

```bash
csdk app-limit-credit list
```

### List appLimitCredit records with pagination

```bash
csdk app-limit-credit list --limit 10 --offset 0
```

### List appLimitCredit records with cursor pagination

```bash
csdk app-limit-credit list --limit 10 --after <cursor>
```

### Find first matching appLimitCredit

```bash
csdk app-limit-credit find-first --where.id.equalTo <value>
```

### List appLimitCredit records with field selection

```bash
csdk app-limit-credit list --select id,id
```

### List appLimitCredit records with filtering and ordering

```bash
csdk app-limit-credit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitCredit

```bash
csdk app-limit-credit create --defaultLimitId <UUID> --amount <BigInt> [--actorId <UUID>] [--creditType <String>] [--reason <String>]
```

### Get a appLimitCredit by id

```bash
csdk app-limit-credit get --id <value>
```
