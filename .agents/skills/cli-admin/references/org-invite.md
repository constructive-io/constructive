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
csdk org-invite create --entityId <UUID> [--channel <String>] [--data <JSON>] [--email <Email>] [--expiresAt <Datetime>] [--inviteCount <Int>] [--inviteLimit <Int>] [--inviteToken <String>] [--inviteValid <Boolean>] [--isReadOnly <Boolean>] [--multiple <Boolean>] [--phone <String>] [--profileId <UUID>] [--receiverId <UUID>] [--senderId <UUID>]
csdk org-invite update --id <UUID> [--channel <String>] [--data <JSON>] [--email <Email>] [--entityId <UUID>] [--expiresAt <Datetime>] [--inviteCount <Int>] [--inviteLimit <Int>] [--inviteToken <String>] [--inviteValid <Boolean>] [--isReadOnly <Boolean>] [--multiple <Boolean>] [--phone <String>] [--profileId <UUID>] [--receiverId <UUID>] [--senderId <UUID>]
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
csdk org-invite create --entityId <UUID> [--channel <String>] [--data <JSON>] [--email <Email>] [--expiresAt <Datetime>] [--inviteCount <Int>] [--inviteLimit <Int>] [--inviteToken <String>] [--inviteValid <Boolean>] [--isReadOnly <Boolean>] [--multiple <Boolean>] [--phone <String>] [--profileId <UUID>] [--receiverId <UUID>] [--senderId <UUID>]
```

### Get a orgInvite by id

```bash
csdk org-invite get --id <value>
```
