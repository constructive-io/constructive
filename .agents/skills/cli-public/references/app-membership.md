# appMembership

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppMembership records via csdk CLI

## Usage

```bash
csdk app-membership list
csdk app-membership get --id <UUID>
csdk app-membership create --actorId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isVerified <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
csdk app-membership update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isVerified <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--actorId <UUID>] [--profileId <UUID>]
csdk app-membership delete --id <UUID>
```

## Examples

### List all appMembership records

```bash
csdk app-membership list
```

### Create a appMembership

```bash
csdk app-membership create --actorId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--isBanned <Boolean>] [--isDisabled <Boolean>] [--isVerified <Boolean>] [--isActive <Boolean>] [--isOwner <Boolean>] [--isAdmin <Boolean>] [--permissions <BitString>] [--granted <BitString>] [--profileId <UUID>]
```

### Get a appMembership by id

```bash
csdk app-membership get --id <value>
```
