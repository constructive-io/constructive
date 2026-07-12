# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Principal records via csdk CLI

## Usage

```bash
csdk principal list
csdk principal list --where.<field>.<op> <value> --orderBy <values>
csdk principal list --limit 10 --after <cursor>
csdk principal find-first --where.<field>.<op> <value>
csdk principal get --principalId <UUID>
csdk principal create --id <UUID> --ownerId <UUID> --userId <UUID> --name <String> --useAdminOwner <Boolean> --isReadOnly <Boolean> --bypassStepUp <Boolean>
csdk principal update --principalId <UUID> [--id <UUID>] [--ownerId <UUID>] [--userId <UUID>] [--name <String>] [--useAdminOwner <Boolean>] [--isReadOnly <Boolean>] [--bypassStepUp <Boolean>]
csdk principal delete --principalId <UUID>
```

## Examples

### List principal records

```bash
csdk principal list
```

### List principal records with pagination

```bash
csdk principal list --limit 10 --offset 0
```

### List principal records with cursor pagination

```bash
csdk principal list --limit 10 --after <cursor>
```

### Find first matching principal

```bash
csdk principal find-first --where.principalId.equalTo <value>
```

### List principal records with field selection

```bash
csdk principal list --select id,principalId
```

### List principal records with filtering and ordering

```bash
csdk principal list --where.principalId.equalTo <value> --orderBy PRINCIPAL_ID_ASC
```

### Create a principal

```bash
csdk principal create --id <UUID> --ownerId <UUID> --userId <UUID> --name <String> --useAdminOwner <Boolean> --isReadOnly <Boolean> --bypassStepUp <Boolean>
```

### Get a principal by principalId

```bash
csdk principal get --principalId <value>
```
