# platformImage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformImage records via csdk CLI

## Usage

```bash
csdk platform-image list
csdk platform-image list --where.<field>.<op> <value> --orderBy <values>
csdk platform-image list --limit 10 --after <cursor>
csdk platform-image find-first --where.<field>.<op> <value>
csdk platform-image get --id <UUID>
csdk platform-image create --name <String> --repository <String> [--createdByPrincipal <UUID>] [--description <String>] [--digest <String>] [--expiresAt <Datetime>] [--isPublished <Boolean>] [--labels <JSON>] [--metadata <JSON>] [--ownerId <UUID>] [--platformOnly <Boolean>] [--registryHost <String>] [--runtime <String>] [--tag <String>] [--updatedByPrincipal <UUID>]
csdk platform-image update --id <UUID> [--createdByPrincipal <UUID>] [--description <String>] [--digest <String>] [--expiresAt <Datetime>] [--isPublished <Boolean>] [--labels <JSON>] [--metadata <JSON>] [--name <String>] [--ownerId <UUID>] [--platformOnly <Boolean>] [--registryHost <String>] [--repository <String>] [--runtime <String>] [--tag <String>] [--updatedByPrincipal <UUID>]
csdk platform-image delete --id <UUID>
```

## Examples

### List platformImage records

```bash
csdk platform-image list
```

### List platformImage records with pagination

```bash
csdk platform-image list --limit 10 --offset 0
```

### List platformImage records with cursor pagination

```bash
csdk platform-image list --limit 10 --after <cursor>
```

### Find first matching platformImage

```bash
csdk platform-image find-first --where.id.equalTo <value>
```

### List platformImage records with field selection

```bash
csdk platform-image list --select id,id
```

### List platformImage records with filtering and ordering

```bash
csdk platform-image list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformImage

```bash
csdk platform-image create --name <String> --repository <String> [--createdByPrincipal <UUID>] [--description <String>] [--digest <String>] [--expiresAt <Datetime>] [--isPublished <Boolean>] [--labels <JSON>] [--metadata <JSON>] [--ownerId <UUID>] [--platformOnly <Boolean>] [--registryHost <String>] [--runtime <String>] [--tag <String>] [--updatedByPrincipal <UUID>]
```

### Get a platformImage by id

```bash
csdk platform-image get --id <value>
```
