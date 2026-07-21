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
csdk org-limit-aggregate create --entityId <UUID> [--entityType <String>] [--max <BigInt>] [--name <String>] [--num <BigInt>] [--organizationId <UUID>] [--periodCredits <BigInt>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--reserved <BigInt>] [--softMax <BigInt>] [--windowDuration <Interval>] [--windowStart <Datetime>]
csdk org-limit-aggregate update --id <UUID> [--entityId <UUID>] [--entityType <String>] [--max <BigInt>] [--name <String>] [--num <BigInt>] [--organizationId <UUID>] [--periodCredits <BigInt>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--reserved <BigInt>] [--softMax <BigInt>] [--windowDuration <Interval>] [--windowStart <Datetime>]
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
csdk org-limit-aggregate create --entityId <UUID> [--entityType <String>] [--max <BigInt>] [--name <String>] [--num <BigInt>] [--organizationId <UUID>] [--periodCredits <BigInt>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--reserved <BigInt>] [--softMax <BigInt>] [--windowDuration <Interval>] [--windowStart <Datetime>]
```

### Get a orgLimitAggregate by id

```bash
csdk org-limit-aggregate get --id <value>
```
