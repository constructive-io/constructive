# appOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppOwnerGrant records via csdk CLI

## Usage

```bash
csdk app-owner-grant list
csdk app-owner-grant list --where.<field>.<op> <value> --orderBy <values>
csdk app-owner-grant list --limit 10 --after <cursor>
csdk app-owner-grant find-first --where.<field>.<op> <value>
csdk app-owner-grant get --id <UUID>
csdk app-owner-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-owner-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--grantorId <UUID>]
csdk app-owner-grant delete --id <UUID>
```

## Examples

### List appOwnerGrant records

```bash
csdk app-owner-grant list
```

### List appOwnerGrant records with pagination

```bash
csdk app-owner-grant list --limit 10 --offset 0
```

### List appOwnerGrant records with cursor pagination

```bash
csdk app-owner-grant list --limit 10 --after <cursor>
```

### Find first matching appOwnerGrant

```bash
csdk app-owner-grant find-first --where.id.equalTo <value>
```

### List appOwnerGrant records with field selection

```bash
csdk app-owner-grant list --select id,id
```

### List appOwnerGrant records with filtering and ordering

```bash
csdk app-owner-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appOwnerGrant

```bash
csdk app-owner-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appOwnerGrant by id

```bash
csdk app-owner-grant get --id <value>
```
