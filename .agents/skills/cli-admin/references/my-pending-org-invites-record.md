# myPendingOrgInvitesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MyPendingOrgInvitesRecord records via csdk CLI

## Usage

```bash
csdk my-pending-org-invites-record list
csdk my-pending-org-invites-record list --where.<field>.<op> <value> --orderBy <values>
csdk my-pending-org-invites-record list --limit 10 --after <cursor>
csdk my-pending-org-invites-record find-first --where.<field>.<op> <value>
csdk my-pending-org-invites-record get --id <UUID>
csdk my-pending-org-invites-record create --channel <String> --entityId <UUID> --expiresAt <Datetime> --senderId <UUID>
csdk my-pending-org-invites-record update --id <UUID> [--channel <String>] [--entityId <UUID>] [--expiresAt <Datetime>] [--senderId <UUID>]
csdk my-pending-org-invites-record delete --id <UUID>
```

## Examples

### List myPendingOrgInvitesRecord records

```bash
csdk my-pending-org-invites-record list
```

### List myPendingOrgInvitesRecord records with pagination

```bash
csdk my-pending-org-invites-record list --limit 10 --offset 0
```

### List myPendingOrgInvitesRecord records with cursor pagination

```bash
csdk my-pending-org-invites-record list --limit 10 --after <cursor>
```

### Find first matching myPendingOrgInvitesRecord

```bash
csdk my-pending-org-invites-record find-first --where.id.equalTo <value>
```

### List myPendingOrgInvitesRecord records with field selection

```bash
csdk my-pending-org-invites-record list --select id,id
```

### List myPendingOrgInvitesRecord records with filtering and ordering

```bash
csdk my-pending-org-invites-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a myPendingOrgInvitesRecord

```bash
csdk my-pending-org-invites-record create --channel <String> --entityId <UUID> --expiresAt <Datetime> --senderId <UUID>
```

### Get a myPendingOrgInvitesRecord by id

```bash
csdk my-pending-org-invites-record get --id <value>
```
