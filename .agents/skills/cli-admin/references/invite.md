# invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Invite records via csdk CLI

## Usage

```bash
csdk invite list
csdk invite list --where.<field>.<op> <value> --orderBy <values>
csdk invite list --limit 10 --after <cursor>
csdk invite find-first --where.<field>.<op> <value>
csdk invite get --id <UUID>
csdk invite create [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk invite update --id <UUID> [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk invite delete --id <UUID>
```

## Examples

### List invite records

```bash
csdk invite list
```

### List invite records with pagination

```bash
csdk invite list --limit 10 --offset 0
```

### List invite records with cursor pagination

```bash
csdk invite list --limit 10 --after <cursor>
```

### Find first matching invite

```bash
csdk invite find-first --where.id.equalTo <value>
```

### List invite records with field selection

```bash
csdk invite list --select id,id
```

### List invite records with filtering and ordering

```bash
csdk invite list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a invite

```bash
csdk invite create [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
```

### Get a invite by id

```bash
csdk invite get --id <value>
```
