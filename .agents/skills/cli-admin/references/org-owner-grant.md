# orgOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgOwnerGrant records via csdk CLI

## Usage

```bash
csdk org-owner-grant list
csdk org-owner-grant list --where.<field>.<op> <value> --orderBy <values>
csdk org-owner-grant list --limit 10 --after <cursor>
csdk org-owner-grant find-first --where.<field>.<op> <value>
csdk org-owner-grant get --id <UUID>
csdk org-owner-grant create --entityId <UUID> [--actorId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>]
csdk org-owner-grant update --id <UUID> [--actorId <UUID>] [--entityId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>]
csdk org-owner-grant delete --id <UUID>
```

## Examples

### List orgOwnerGrant records

```bash
csdk org-owner-grant list
```

### List orgOwnerGrant records with pagination

```bash
csdk org-owner-grant list --limit 10 --offset 0
```

### List orgOwnerGrant records with cursor pagination

```bash
csdk org-owner-grant list --limit 10 --after <cursor>
```

### Find first matching orgOwnerGrant

```bash
csdk org-owner-grant find-first --where.id.equalTo <value>
```

### List orgOwnerGrant records with field selection

```bash
csdk org-owner-grant list --select id,id
```

### List orgOwnerGrant records with filtering and ordering

```bash
csdk org-owner-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgOwnerGrant

```bash
csdk org-owner-grant create --entityId <UUID> [--actorId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>]
```

### Get a orgOwnerGrant by id

```bash
csdk org-owner-grant get --id <value>
```
