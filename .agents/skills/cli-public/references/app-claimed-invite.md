# appClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppClaimedInvite records via csdk CLI

## Usage

```bash
csdk app-claimed-invite list
csdk app-claimed-invite list --where.<field>.<op> <value> --orderBy <values>
csdk app-claimed-invite list --limit 10 --after <cursor>
csdk app-claimed-invite find-first --where.<field>.<op> <value>
csdk app-claimed-invite get --id <UUID>
csdk app-claimed-invite create [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
csdk app-claimed-invite update --id <UUID> [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
csdk app-claimed-invite delete --id <UUID>
```

## Examples

### List appClaimedInvite records

```bash
csdk app-claimed-invite list
```

### List appClaimedInvite records with pagination

```bash
csdk app-claimed-invite list --limit 10 --offset 0
```

### List appClaimedInvite records with cursor pagination

```bash
csdk app-claimed-invite list --limit 10 --after <cursor>
```

### Find first matching appClaimedInvite

```bash
csdk app-claimed-invite find-first --where.id.equalTo <value>
```

### List appClaimedInvite records with field selection

```bash
csdk app-claimed-invite list --select id,id
```

### List appClaimedInvite records with filtering and ordering

```bash
csdk app-claimed-invite list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appClaimedInvite

```bash
csdk app-claimed-invite create [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
```

### Get a appClaimedInvite by id

```bash
csdk app-claimed-invite get --id <value>
```
