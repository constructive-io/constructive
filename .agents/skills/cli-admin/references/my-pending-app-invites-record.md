# myPendingAppInvitesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MyPendingAppInvitesRecord records via csdk CLI

## Usage

```bash
csdk my-pending-app-invites-record list
csdk my-pending-app-invites-record list --where.<field>.<op> <value> --orderBy <values>
csdk my-pending-app-invites-record list --limit 10 --after <cursor>
csdk my-pending-app-invites-record find-first --where.<field>.<op> <value>
csdk my-pending-app-invites-record get --id <UUID>
csdk my-pending-app-invites-record create --channel <String> --expiresAt <Datetime> --senderId <UUID>
csdk my-pending-app-invites-record update --id <UUID> [--channel <String>] [--expiresAt <Datetime>] [--senderId <UUID>]
csdk my-pending-app-invites-record delete --id <UUID>
```

## Examples

### List myPendingAppInvitesRecord records

```bash
csdk my-pending-app-invites-record list
```

### List myPendingAppInvitesRecord records with pagination

```bash
csdk my-pending-app-invites-record list --limit 10 --offset 0
```

### List myPendingAppInvitesRecord records with cursor pagination

```bash
csdk my-pending-app-invites-record list --limit 10 --after <cursor>
```

### Find first matching myPendingAppInvitesRecord

```bash
csdk my-pending-app-invites-record find-first --where.id.equalTo <value>
```

### List myPendingAppInvitesRecord records with field selection

```bash
csdk my-pending-app-invites-record list --select id,id
```

### List myPendingAppInvitesRecord records with filtering and ordering

```bash
csdk my-pending-app-invites-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a myPendingAppInvitesRecord

```bash
csdk my-pending-app-invites-record create --channel <String> --expiresAt <Datetime> --senderId <UUID>
```

### Get a myPendingAppInvitesRecord by id

```bash
csdk my-pending-app-invites-record get --id <value>
```
