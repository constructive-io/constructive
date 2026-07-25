# platformDomainVerification

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformDomainVerification records via csdk CLI

## Usage

```bash
csdk platform-domain-verification list
csdk platform-domain-verification list --where.<field>.<op> <value> --orderBy <values>
csdk platform-domain-verification list --limit 10 --after <cursor>
csdk platform-domain-verification find-first --where.<field>.<op> <value>
csdk platform-domain-verification get --id <UUID>
csdk platform-domain-verification create --method <String> [--attempts <Int>] [--domainId <UUID>] [--error <String>] [--expiresAt <Datetime>] [--lastCheckedAt <Datetime>] [--managedDomainId <UUID>] [--recordName <String>] [--recordType <String>] [--recordValue <String>] [--status <String>] [--verifiedAt <Datetime>]
csdk platform-domain-verification update --id <UUID> [--attempts <Int>] [--domainId <UUID>] [--error <String>] [--expiresAt <Datetime>] [--lastCheckedAt <Datetime>] [--managedDomainId <UUID>] [--method <String>] [--recordName <String>] [--recordType <String>] [--recordValue <String>] [--status <String>] [--verifiedAt <Datetime>]
csdk platform-domain-verification delete --id <UUID>
```

## Examples

### List platformDomainVerification records

```bash
csdk platform-domain-verification list
```

### List platformDomainVerification records with pagination

```bash
csdk platform-domain-verification list --limit 10 --offset 0
```

### List platformDomainVerification records with cursor pagination

```bash
csdk platform-domain-verification list --limit 10 --after <cursor>
```

### Find first matching platformDomainVerification

```bash
csdk platform-domain-verification find-first --where.id.equalTo <value>
```

### List platformDomainVerification records with field selection

```bash
csdk platform-domain-verification list --select id,id
```

### List platformDomainVerification records with filtering and ordering

```bash
csdk platform-domain-verification list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformDomainVerification

```bash
csdk platform-domain-verification create --method <String> [--attempts <Int>] [--domainId <UUID>] [--error <String>] [--expiresAt <Datetime>] [--lastCheckedAt <Datetime>] [--managedDomainId <UUID>] [--recordName <String>] [--recordType <String>] [--recordValue <String>] [--status <String>] [--verifiedAt <Datetime>]
```

### Get a platformDomainVerification by id

```bash
csdk platform-domain-verification get --id <value>
```
