# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppGrant records via csdk CLI

## Usage

```bash
csdk app-grant list
csdk app-grant list --where.<field>.<op> <value> --orderBy <values>
csdk app-grant list --limit 10 --after <cursor>
csdk app-grant find-first --where.<field>.<op> <value>
csdk app-grant get --id <UUID>
csdk app-grant create --actorId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-grant update --id <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--actorId <UUID>] [--grantorId <UUID>]
csdk app-grant delete --id <UUID>
```

## Examples

### List appGrant records

```bash
csdk app-grant list
```

### List appGrant records with pagination

```bash
csdk app-grant list --limit 10 --offset 0
```

### List appGrant records with cursor pagination

```bash
csdk app-grant list --limit 10 --after <cursor>
```

### Find first matching appGrant

```bash
csdk app-grant find-first --where.id.equalTo <value>
```

### List appGrant records with field selection

```bash
csdk app-grant list --select id,id
```

### List appGrant records with filtering and ordering

```bash
csdk app-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appGrant

```bash
csdk app-grant create --actorId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appGrant by id

```bash
csdk app-grant get --id <value>
```
