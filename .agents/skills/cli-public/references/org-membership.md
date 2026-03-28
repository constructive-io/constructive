# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembership records via csdk CLI

## Usage

```bash
csdk org-membership list
csdk org-membership list --where.<field>.<op> <value> --orderBy <values>
csdk org-membership list --limit 10 --after <cursor>
csdk org-membership find-first --where.<field>.<op> <value>
csdk org-membership get --id <UUID>
csdk org-membership create --actorId <UUID> --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
csdk org-membership update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--actorId <UUID>] [--entityId <UUID>] [--profileId <UUID>]
csdk org-membership delete --id <UUID>
```

## Examples

### List orgMembership records

```bash
csdk org-membership list
```

### List orgMembership records with pagination

```bash
csdk org-membership list --limit 10 --offset 0
```

### List orgMembership records with cursor pagination

```bash
csdk org-membership list --limit 10 --after <cursor>
```

### Find first matching orgMembership

```bash
csdk org-membership find-first --where.id.equalTo <value>
```

### List orgMembership records with field selection

```bash
csdk org-membership list --select id,id
```

### List orgMembership records with filtering and ordering

```bash
csdk org-membership list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgMembership

```bash
csdk org-membership create --actorId <UUID> --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
```

### Get a orgMembership by id

```bash
csdk org-membership get --id <value>
```
