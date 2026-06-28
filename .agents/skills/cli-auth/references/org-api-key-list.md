# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgApiKeyList records via csdk CLI

## Usage

```bash
csdk org-api-key-list list
csdk org-api-key-list list --where.<field>.<op> <value> --orderBy <values>
csdk org-api-key-list list --limit 10 --after <cursor>
csdk org-api-key-list find-first --where.<field>.<op> <value>
csdk org-api-key-list get --id <UUID>
csdk org-api-key-list create [--keyId <String>] [--name <String>] [--principalId <UUID>] [--orgId <UUID>] [--expiresAt <Datetime>] [--revokedAt <Datetime>] [--lastUsedAt <Datetime>] [--mfaLevel <String>] [--accessLevel <String>]
csdk org-api-key-list update --id <UUID> [--keyId <String>] [--name <String>] [--principalId <UUID>] [--orgId <UUID>] [--expiresAt <Datetime>] [--revokedAt <Datetime>] [--lastUsedAt <Datetime>] [--mfaLevel <String>] [--accessLevel <String>]
csdk org-api-key-list delete --id <UUID>
```

## Examples

### List orgApiKeyList records

```bash
csdk org-api-key-list list
```

### List orgApiKeyList records with pagination

```bash
csdk org-api-key-list list --limit 10 --offset 0
```

### List orgApiKeyList records with cursor pagination

```bash
csdk org-api-key-list list --limit 10 --after <cursor>
```

### Find first matching orgApiKeyList

```bash
csdk org-api-key-list find-first --where.id.equalTo <value>
```

### List orgApiKeyList records with field selection

```bash
csdk org-api-key-list list --select id,id
```

### List orgApiKeyList records with filtering and ordering

```bash
csdk org-api-key-list list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgApiKeyList

```bash
csdk org-api-key-list create [--keyId <String>] [--name <String>] [--principalId <UUID>] [--orgId <UUID>] [--expiresAt <Datetime>] [--revokedAt <Datetime>] [--lastUsedAt <Datetime>] [--mfaLevel <String>] [--accessLevel <String>]
```

### Get a orgApiKeyList by id

```bash
csdk org-api-key-list get --id <value>
```
