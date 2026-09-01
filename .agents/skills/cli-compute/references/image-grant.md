# imageGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ImageGrant records via csdk CLI

## Usage

```bash
csdk image-grant list
csdk image-grant list --where.<field>.<op> <value> --orderBy <values>
csdk image-grant list --limit 10 --after <cursor>
csdk image-grant find-first --where.<field>.<op> <value>
csdk image-grant get --id <UUID>
csdk image-grant create --databaseId <UUID> --granteeKey <UUID> --granteeScope <String> --imageId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk image-grant update --id <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--granteeKey <UUID>] [--granteeScope <String>] [--imageId <UUID>] [--updatedByPrincipal <UUID>]
csdk image-grant delete --id <UUID>
```

## Examples

### List imageGrant records

```bash
csdk image-grant list
```

### List imageGrant records with pagination

```bash
csdk image-grant list --limit 10 --offset 0
```

### List imageGrant records with cursor pagination

```bash
csdk image-grant list --limit 10 --after <cursor>
```

### Find first matching imageGrant

```bash
csdk image-grant find-first --where.id.equalTo <value>
```

### List imageGrant records with field selection

```bash
csdk image-grant list --select id,id
```

### List imageGrant records with filtering and ordering

```bash
csdk image-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a imageGrant

```bash
csdk image-grant create --databaseId <UUID> --granteeKey <UUID> --granteeScope <String> --imageId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a imageGrant by id

```bash
csdk image-grant get --id <value>
```
