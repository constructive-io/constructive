# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgInvite records via csdk CLI

## Usage

```bash
csdk org-invite list
csdk org-invite list --where.<field>.<op> <value> --orderBy <values>
csdk org-invite list --limit 10 --after <cursor>
csdk org-invite find-first --where.<field>.<op> <value>
csdk org-invite get --id <UUID>
csdk org-invite create --entityId <UUID> [--email <Email>] [--senderId <UUID>] [--receiverId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk org-invite update --id <UUID> [--email <Email>] [--senderId <UUID>] [--receiverId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>] [--entityId <UUID>]
csdk org-invite delete --id <UUID>
```

## Examples

### List orgInvite records

```bash
csdk org-invite list
```

### List orgInvite records with pagination

```bash
csdk org-invite list --limit 10 --offset 0
```

### List orgInvite records with cursor pagination

```bash
csdk org-invite list --limit 10 --after <cursor>
```

### Find first matching orgInvite

```bash
csdk org-invite find-first --where.id.equalTo <value>
```

### List orgInvite records with field selection

```bash
csdk org-invite list --select id,id
```

### List orgInvite records with filtering and ordering

```bash
csdk org-invite list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgInvite

```bash
csdk org-invite create --entityId <UUID> [--email <Email>] [--senderId <UUID>] [--receiverId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
```

### Get a orgInvite by id

```bash
csdk org-invite get --id <value>
```
