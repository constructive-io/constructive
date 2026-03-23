# orgMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembership records via csdk CLI

## Usage

```bash
csdk org-membership list
csdk org-membership get --id <UUID>
csdk org-membership create --actorId <UUID> --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
csdk org-membership update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--actorId <UUID>] [--entityId <UUID>] [--profileId <UUID>]
csdk org-membership delete --id <UUID>
```

## Examples

### List all orgMembership records

```bash
csdk org-membership list
```

### Create a orgMembership

```bash
csdk org-membership create --actorId <UUID> --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
```

### Get a orgMembership by id

```bash
csdk org-membership get --id <value>
```
