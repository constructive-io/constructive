# appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimit records via csdk CLI

## Usage

```bash
csdk app-limit list
csdk app-limit list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit list --limit 10 --after <cursor>
csdk app-limit find-first --where.<field>.<op> <value>
csdk app-limit get --id <UUID>
csdk app-limit create --actorId <UUID> [--entityType <String>] [--max <BigInt>] [--name <String>] [--num <BigInt>] [--organizationId <UUID>] [--periodCredits <BigInt>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--softMax <BigInt>] [--windowDuration <Interval>] [--windowStart <Datetime>]
csdk app-limit update --id <UUID> [--actorId <UUID>] [--entityType <String>] [--max <BigInt>] [--name <String>] [--num <BigInt>] [--organizationId <UUID>] [--periodCredits <BigInt>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--softMax <BigInt>] [--windowDuration <Interval>] [--windowStart <Datetime>]
csdk app-limit delete --id <UUID>
```

## Examples

### List appLimit records

```bash
csdk app-limit list
```

### List appLimit records with pagination

```bash
csdk app-limit list --limit 10 --offset 0
```

### List appLimit records with cursor pagination

```bash
csdk app-limit list --limit 10 --after <cursor>
```

### Find first matching appLimit

```bash
csdk app-limit find-first --where.id.equalTo <value>
```

### List appLimit records with field selection

```bash
csdk app-limit list --select id,id
```

### List appLimit records with filtering and ordering

```bash
csdk app-limit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimit

```bash
csdk app-limit create --actorId <UUID> [--entityType <String>] [--max <BigInt>] [--name <String>] [--num <BigInt>] [--organizationId <UUID>] [--periodCredits <BigInt>] [--planMax <BigInt>] [--purchasedCredits <BigInt>] [--softMax <BigInt>] [--windowDuration <Interval>] [--windowStart <Datetime>]
```

### Get a appLimit by id

```bash
csdk app-limit get --id <value>
```
