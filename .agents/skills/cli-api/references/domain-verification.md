# domainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DomainVerification records via csdk CLI

## Usage

```bash
csdk domain-verification list
csdk domain-verification list --where.<field>.<op> <value> --orderBy <values>
csdk domain-verification list --limit 10 --after <cursor>
csdk domain-verification find-first --where.<field>.<op> <value>
csdk domain-verification get --id <UUID>
csdk domain-verification create --managedDomainId <UUID> --ownerId <UUID> [--attempts <Int>] [--error <String>] [--expiresAt <Datetime>] [--lastCheckedAt <Datetime>] [--method <String>] [--recordName <String>] [--recordType <String>] [--recordValue <String>] [--status <String>] [--verifiedAt <Datetime>]
csdk domain-verification update --id <UUID> [--attempts <Int>] [--error <String>] [--expiresAt <Datetime>] [--lastCheckedAt <Datetime>] [--managedDomainId <UUID>] [--method <String>] [--ownerId <UUID>] [--recordName <String>] [--recordType <String>] [--recordValue <String>] [--status <String>] [--verifiedAt <Datetime>]
csdk domain-verification delete --id <UUID>
```

## Examples

### List domainVerification records

```bash
csdk domain-verification list
```

### List domainVerification records with pagination

```bash
csdk domain-verification list --limit 10 --offset 0
```

### List domainVerification records with cursor pagination

```bash
csdk domain-verification list --limit 10 --after <cursor>
```

### Find first matching domainVerification

```bash
csdk domain-verification find-first --where.id.equalTo <value>
```

### List domainVerification records with field selection

```bash
csdk domain-verification list --select id,id
```

### List domainVerification records with filtering and ordering

```bash
csdk domain-verification list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a domainVerification

```bash
csdk domain-verification create --managedDomainId <UUID> --ownerId <UUID> [--attempts <Int>] [--error <String>] [--expiresAt <Datetime>] [--lastCheckedAt <Datetime>] [--method <String>] [--recordName <String>] [--recordType <String>] [--recordValue <String>] [--status <String>] [--verifiedAt <Datetime>]
```

### Get a domainVerification by id

```bash
csdk domain-verification get --id <value>
```
