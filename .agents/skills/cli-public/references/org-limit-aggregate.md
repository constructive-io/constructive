# orgLimitAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimitAggregate records via csdk CLI

## Usage

```bash
csdk org-limit-aggregate list
csdk org-limit-aggregate list --where.<field>.<op> <value> --orderBy <values>
csdk org-limit-aggregate list --limit 10 --after <cursor>
csdk org-limit-aggregate find-first --where.<field>.<op> <value>
csdk org-limit-aggregate get --id <UUID>
csdk org-limit-aggregate create --entityId <UUID> [--name <String>] [--num <BigInt>] [--max <BigInt>] [--softMax <BigInt>] [--windowStart <Datetime>] [--windowDuration <Interval>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--periodCredits <BigInt>] [--reserved <BigInt>] [--organizationId <UUID>] [--entityType <String>]
csdk org-limit-aggregate update --id <UUID> [--name <String>] [--entityId <UUID>] [--num <BigInt>] [--max <BigInt>] [--softMax <BigInt>] [--windowStart <Datetime>] [--windowDuration <Interval>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--periodCredits <BigInt>] [--reserved <BigInt>] [--organizationId <UUID>] [--entityType <String>]
csdk org-limit-aggregate delete --id <UUID>
```

## Examples

### List orgLimitAggregate records

```bash
csdk org-limit-aggregate list
```

### List orgLimitAggregate records with pagination

```bash
csdk org-limit-aggregate list --limit 10 --offset 0
```

### List orgLimitAggregate records with cursor pagination

```bash
csdk org-limit-aggregate list --limit 10 --after <cursor>
```

### Find first matching orgLimitAggregate

```bash
csdk org-limit-aggregate find-first --where.id.equalTo <value>
```

### List orgLimitAggregate records with field selection

```bash
csdk org-limit-aggregate list --select id,id
```

### List orgLimitAggregate records with filtering and ordering

```bash
csdk org-limit-aggregate list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgLimitAggregate

```bash
csdk org-limit-aggregate create --entityId <UUID> [--name <String>] [--num <BigInt>] [--max <BigInt>] [--softMax <BigInt>] [--windowStart <Datetime>] [--windowDuration <Interval>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--periodCredits <BigInt>] [--reserved <BigInt>] [--organizationId <UUID>] [--entityType <String>]
```

### Get a orgLimitAggregate by id

```bash
csdk org-limit-aggregate get --id <value>
```
