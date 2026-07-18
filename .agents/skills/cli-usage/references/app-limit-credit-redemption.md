# appLimitCreditRedemption

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitCreditRedemption records via csdk CLI

## Usage

```bash
csdk app-limit-credit-redemption list
csdk app-limit-credit-redemption list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-credit-redemption list --limit 10 --after <cursor>
csdk app-limit-credit-redemption find-first --where.<field>.<op> <value>
csdk app-limit-credit-redemption get --id <UUID>
csdk app-limit-credit-redemption create --creditCodeId <UUID> --entityId <UUID> [--entityType <String>] [--organizationId <UUID>]
csdk app-limit-credit-redemption update --id <UUID> [--creditCodeId <UUID>] [--entityId <UUID>] [--entityType <String>] [--organizationId <UUID>]
csdk app-limit-credit-redemption delete --id <UUID>
```

## Examples

### List appLimitCreditRedemption records

```bash
csdk app-limit-credit-redemption list
```

### List appLimitCreditRedemption records with pagination

```bash
csdk app-limit-credit-redemption list --limit 10 --offset 0
```

### List appLimitCreditRedemption records with cursor pagination

```bash
csdk app-limit-credit-redemption list --limit 10 --after <cursor>
```

### Find first matching appLimitCreditRedemption

```bash
csdk app-limit-credit-redemption find-first --where.id.equalTo <value>
```

### List appLimitCreditRedemption records with field selection

```bash
csdk app-limit-credit-redemption list --select id,id
```

### List appLimitCreditRedemption records with filtering and ordering

```bash
csdk app-limit-credit-redemption list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitCreditRedemption

```bash
csdk app-limit-credit-redemption create --creditCodeId <UUID> --entityId <UUID> [--entityType <String>] [--organizationId <UUID>]
```

### Get a appLimitCreditRedemption by id

```bash
csdk app-limit-credit-redemption get --id <value>
```
