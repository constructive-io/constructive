# orgClaimedInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgClaimedInvite records via csdk CLI

## Usage

```bash
csdk org-claimed-invite list
csdk org-claimed-invite list --where.<field>.<op> <value> --orderBy <values>
csdk org-claimed-invite list --limit 10 --after <cursor>
csdk org-claimed-invite find-first --where.<field>.<op> <value>
csdk org-claimed-invite get --id <UUID>
csdk org-claimed-invite create --entityId <UUID> [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
csdk org-claimed-invite update --id <UUID> [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>] [--entityId <UUID>]
csdk org-claimed-invite delete --id <UUID>
```

## Examples

### List orgClaimedInvite records

```bash
csdk org-claimed-invite list
```

### List orgClaimedInvite records with pagination

```bash
csdk org-claimed-invite list --limit 10 --offset 0
```

### List orgClaimedInvite records with cursor pagination

```bash
csdk org-claimed-invite list --limit 10 --after <cursor>
```

### Find first matching orgClaimedInvite

```bash
csdk org-claimed-invite find-first --where.id.equalTo <value>
```

### List orgClaimedInvite records with field selection

```bash
csdk org-claimed-invite list --select id,id
```

### List orgClaimedInvite records with filtering and ordering

```bash
csdk org-claimed-invite list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgClaimedInvite

```bash
csdk org-claimed-invite create --entityId <UUID> [--data <JSON>] [--senderId <UUID>] [--receiverId <UUID>]
```

### Get a orgClaimedInvite by id

```bash
csdk org-claimed-invite get --id <value>
```
