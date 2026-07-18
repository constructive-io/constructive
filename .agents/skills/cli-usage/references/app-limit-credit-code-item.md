# appLimitCreditCodeItem

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitCreditCodeItem records via csdk CLI

## Usage

```bash
csdk app-limit-credit-code-item list
csdk app-limit-credit-code-item list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-credit-code-item list --limit 10 --after <cursor>
csdk app-limit-credit-code-item find-first --where.<field>.<op> <value>
csdk app-limit-credit-code-item get --id <UUID>
csdk app-limit-credit-code-item create --amount <BigInt> --creditCodeId <UUID> --defaultLimitId <UUID> [--creditType <String>]
csdk app-limit-credit-code-item update --id <UUID> [--amount <BigInt>] [--creditCodeId <UUID>] [--creditType <String>] [--defaultLimitId <UUID>]
csdk app-limit-credit-code-item delete --id <UUID>
```

## Examples

### List appLimitCreditCodeItem records

```bash
csdk app-limit-credit-code-item list
```

### List appLimitCreditCodeItem records with pagination

```bash
csdk app-limit-credit-code-item list --limit 10 --offset 0
```

### List appLimitCreditCodeItem records with cursor pagination

```bash
csdk app-limit-credit-code-item list --limit 10 --after <cursor>
```

### Find first matching appLimitCreditCodeItem

```bash
csdk app-limit-credit-code-item find-first --where.id.equalTo <value>
```

### List appLimitCreditCodeItem records with field selection

```bash
csdk app-limit-credit-code-item list --select id,id
```

### List appLimitCreditCodeItem records with filtering and ordering

```bash
csdk app-limit-credit-code-item list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitCreditCodeItem

```bash
csdk app-limit-credit-code-item create --amount <BigInt> --creditCodeId <UUID> --defaultLimitId <UUID> [--creditType <String>]
```

### Get a appLimitCreditCodeItem by id

```bash
csdk app-limit-credit-code-item get --id <value>
```
