# appInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppInvite records via csdk CLI

## Usage

```bash
csdk app-invite list
csdk app-invite list --where.<field>.<op> <value> --orderBy <values>
csdk app-invite list --limit 10 --after <cursor>
csdk app-invite find-first --where.<field>.<op> <value>
csdk app-invite get --id <UUID>
csdk app-invite create [--channel <String>] [--data <JSON>] [--email <Email>] [--expiresAt <Datetime>] [--inviteCount <Int>] [--inviteLimit <Int>] [--inviteToken <String>] [--inviteValid <Boolean>] [--multiple <Boolean>] [--phone <String>] [--profileId <UUID>] [--senderId <UUID>]
csdk app-invite update --id <UUID> [--channel <String>] [--data <JSON>] [--email <Email>] [--expiresAt <Datetime>] [--inviteCount <Int>] [--inviteLimit <Int>] [--inviteToken <String>] [--inviteValid <Boolean>] [--multiple <Boolean>] [--phone <String>] [--profileId <UUID>] [--senderId <UUID>]
csdk app-invite delete --id <UUID>
```

## Examples

### List appInvite records

```bash
csdk app-invite list
```

### List appInvite records with pagination

```bash
csdk app-invite list --limit 10 --offset 0
```

### List appInvite records with cursor pagination

```bash
csdk app-invite list --limit 10 --after <cursor>
```

### Find first matching appInvite

```bash
csdk app-invite find-first --where.id.equalTo <value>
```

### List appInvite records with field selection

```bash
csdk app-invite list --select id,id
```

### List appInvite records with filtering and ordering

```bash
csdk app-invite list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appInvite

```bash
csdk app-invite create [--channel <String>] [--data <JSON>] [--email <Email>] [--expiresAt <Datetime>] [--inviteCount <Int>] [--inviteLimit <Int>] [--inviteToken <String>] [--inviteValid <Boolean>] [--multiple <Boolean>] [--phone <String>] [--profileId <UUID>] [--senderId <UUID>]
```

### Get a appInvite by id

```bash
csdk app-invite get --id <value>
```
