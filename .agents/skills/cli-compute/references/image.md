# image

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Image records via csdk CLI

## Usage

```bash
csdk image list
csdk image list --where.<field>.<op> <value> --orderBy <values>
csdk image list --limit 10 --after <cursor>
csdk image find-first --where.<field>.<op> <value>
csdk image get --id <UUID>
csdk image create --databaseId <UUID> --name <String> --repository <String> [--createdByPrincipal <UUID>] [--description <String>] [--digest <String>] [--expiresAt <Datetime>] [--isPublished <Boolean>] [--labels <JSON>] [--metadata <JSON>] [--ownerId <UUID>] [--platformOnly <Boolean>] [--registryHost <String>] [--runtime <String>] [--tag <String>] [--updatedByPrincipal <UUID>]
csdk image update --id <UUID> [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--description <String>] [--digest <String>] [--expiresAt <Datetime>] [--isPublished <Boolean>] [--labels <JSON>] [--metadata <JSON>] [--name <String>] [--ownerId <UUID>] [--platformOnly <Boolean>] [--registryHost <String>] [--repository <String>] [--runtime <String>] [--tag <String>] [--updatedByPrincipal <UUID>]
csdk image delete --id <UUID>
```

## Examples

### List image records

```bash
csdk image list
```

### List image records with pagination

```bash
csdk image list --limit 10 --offset 0
```

### List image records with cursor pagination

```bash
csdk image list --limit 10 --after <cursor>
```

### Find first matching image

```bash
csdk image find-first --where.id.equalTo <value>
```

### List image records with field selection

```bash
csdk image list --select id,id
```

### List image records with filtering and ordering

```bash
csdk image list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a image

```bash
csdk image create --databaseId <UUID> --name <String> --repository <String> [--createdByPrincipal <UUID>] [--description <String>] [--digest <String>] [--expiresAt <Datetime>] [--isPublished <Boolean>] [--labels <JSON>] [--metadata <JSON>] [--ownerId <UUID>] [--platformOnly <Boolean>] [--registryHost <String>] [--runtime <String>] [--tag <String>] [--updatedByPrincipal <UUID>]
```

### Get a image by id

```bash
csdk image get --id <value>
```
