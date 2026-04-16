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
csdk app-invite create [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk app-invite update --id <UUID> [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
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
csdk app-invite create [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
```

### Get a appInvite by id

```bash
csdk app-invite get --id <value>
```
