# claimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ClaimedInvite records via csdk CLI

## Usage

```bash
csdk claimed-invite list
csdk claimed-invite list --where.<field>.<op> <value> --orderBy <values>
csdk claimed-invite list --limit 10 --after <cursor>
csdk claimed-invite find-first --where.<field>.<op> <value>
csdk claimed-invite get --id <UUID>
csdk claimed-invite create [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
csdk claimed-invite update --id <UUID> [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
csdk claimed-invite delete --id <UUID>
```

## Examples

### List claimedInvite records

```bash
csdk claimed-invite list
```

### List claimedInvite records with pagination

```bash
csdk claimed-invite list --limit 10 --offset 0
```

### List claimedInvite records with cursor pagination

```bash
csdk claimed-invite list --limit 10 --after <cursor>
```

### Find first matching claimedInvite

```bash
csdk claimed-invite find-first --where.id.equalTo <value>
```

### List claimedInvite records with field selection

```bash
csdk claimed-invite list --select id,id
```

### List claimedInvite records with filtering and ordering

```bash
csdk claimed-invite list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a claimedInvite

```bash
csdk claimed-invite create [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
```

### Get a claimedInvite by id

```bash
csdk claimed-invite get --id <value>
```
