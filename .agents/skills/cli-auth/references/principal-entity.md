# principalEntity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PrincipalEntity records via csdk CLI

## Usage

```bash
csdk principal-entity list
csdk principal-entity list --where.<field>.<op> <value> --orderBy <values>
csdk principal-entity list --limit 10 --after <cursor>
csdk principal-entity find-first --where.<field>.<op> <value>
csdk principal-entity get --id <UUID>
csdk principal-entity create --entityId <UUID> --ownerId <UUID> --principalId <UUID>
csdk principal-entity update --id <UUID> [--entityId <UUID>] [--ownerId <UUID>] [--principalId <UUID>]
csdk principal-entity delete --id <UUID>
```

## Examples

### List principalEntity records

```bash
csdk principal-entity list
```

### List principalEntity records with pagination

```bash
csdk principal-entity list --limit 10 --offset 0
```

### List principalEntity records with cursor pagination

```bash
csdk principal-entity list --limit 10 --after <cursor>
```

### Find first matching principalEntity

```bash
csdk principal-entity find-first --where.id.equalTo <value>
```

### List principalEntity records with field selection

```bash
csdk principal-entity list --select id,id
```

### List principalEntity records with filtering and ordering

```bash
csdk principal-entity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a principalEntity

```bash
csdk principal-entity create --entityId <UUID> --ownerId <UUID> --principalId <UUID>
```

### Get a principalEntity by id

```bash
csdk principal-entity get --id <value>
```
