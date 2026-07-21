# appLimitCreditCode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitCreditCode records via csdk CLI

## Usage

```bash
csdk app-limit-credit-code list
csdk app-limit-credit-code list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-credit-code list --limit 10 --after <cursor>
csdk app-limit-credit-code find-first --where.<field>.<op> <value>
csdk app-limit-credit-code get --id <UUID>
csdk app-limit-credit-code create --code <String> [--currentRedemptions <Int>] [--expiresAt <Datetime>] [--maxRedemptions <Int>]
csdk app-limit-credit-code update --id <UUID> [--code <String>] [--currentRedemptions <Int>] [--expiresAt <Datetime>] [--maxRedemptions <Int>]
csdk app-limit-credit-code delete --id <UUID>
```

## Examples

### List appLimitCreditCode records

```bash
csdk app-limit-credit-code list
```

### List appLimitCreditCode records with pagination

```bash
csdk app-limit-credit-code list --limit 10 --offset 0
```

### List appLimitCreditCode records with cursor pagination

```bash
csdk app-limit-credit-code list --limit 10 --after <cursor>
```

### Find first matching appLimitCreditCode

```bash
csdk app-limit-credit-code find-first --where.id.equalTo <value>
```

### List appLimitCreditCode records with field selection

```bash
csdk app-limit-credit-code list --select id,id
```

### List appLimitCreditCode records with filtering and ordering

```bash
csdk app-limit-credit-code list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitCreditCode

```bash
csdk app-limit-credit-code create --code <String> [--currentRedemptions <Int>] [--expiresAt <Datetime>] [--maxRedemptions <Int>]
```

### Get a appLimitCreditCode by id

```bash
csdk app-limit-credit-code get --id <value>
```
