# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppMembership records via csdk CLI

## Usage

```bash
csdk app-membership list
csdk app-membership list --where.<field>.<op> <value> --orderBy <values>
csdk app-membership list --limit 10 --after <cursor>
csdk app-membership find-first --where.<field>.<op> <value>
csdk app-membership get --id <UUID>
csdk app-membership create --actorId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isVerified <Boolean>] [--isActive <Boolean>] [--isExternal <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
csdk app-membership update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isVerified <Boolean>] [--isActive <Boolean>] [--isExternal <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--actorId <UUID>] [--profileId <UUID>]
csdk app-membership delete --id <UUID>
```

## Examples

### List appMembership records

```bash
csdk app-membership list
```

### List appMembership records with pagination

```bash
csdk app-membership list --limit 10 --offset 0
```

### List appMembership records with cursor pagination

```bash
csdk app-membership list --limit 10 --after <cursor>
```

### Find first matching appMembership

```bash
csdk app-membership find-first --where.id.equalTo <value>
```

### List appMembership records with field selection

```bash
csdk app-membership list --select id,id
```

### List appMembership records with filtering and ordering

```bash
csdk app-membership list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appMembership

```bash
csdk app-membership create --actorId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isVerified <Boolean>] [--isActive <Boolean>] [--isExternal <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
```

### Get a appMembership by id

```bash
csdk app-membership get --id <value>
```
