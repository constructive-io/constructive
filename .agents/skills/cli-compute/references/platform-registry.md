# platformRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformRegistry records via csdk CLI

## Usage

```bash
csdk platform-registry list
csdk platform-registry list --where.<field>.<op> <value> --orderBy <values>
csdk platform-registry list --limit 10 --after <cursor>
csdk platform-registry find-first --where.<field>.<op> <value>
csdk platform-registry get --id <UUID>
csdk platform-registry create --kind <String> --name <String> [--authMode <String>] [--basePath <String>] [--createdByPrincipal <UUID>] [--credentialSecretName <String>] [--host <String>] [--installationId <UUID>] [--isPublished <Boolean>] [--labels <JSON>] [--lastError <String>] [--metadata <JSON>] [--platformOnly <Boolean>] [--role <String>] [--status <String>] [--updatedByPrincipal <UUID>]
csdk platform-registry update --id <UUID> [--authMode <String>] [--basePath <String>] [--createdByPrincipal <UUID>] [--credentialSecretName <String>] [--host <String>] [--installationId <UUID>] [--isPublished <Boolean>] [--kind <String>] [--labels <JSON>] [--lastError <String>] [--metadata <JSON>] [--name <String>] [--platformOnly <Boolean>] [--role <String>] [--status <String>] [--updatedByPrincipal <UUID>]
csdk platform-registry delete --id <UUID>
```

## Examples

### List platformRegistry records

```bash
csdk platform-registry list
```

### List platformRegistry records with pagination

```bash
csdk platform-registry list --limit 10 --offset 0
```

### List platformRegistry records with cursor pagination

```bash
csdk platform-registry list --limit 10 --after <cursor>
```

### Find first matching platformRegistry

```bash
csdk platform-registry find-first --where.id.equalTo <value>
```

### List platformRegistry records with field selection

```bash
csdk platform-registry list --select id,id
```

### List platformRegistry records with filtering and ordering

```bash
csdk platform-registry list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformRegistry

```bash
csdk platform-registry create --kind <String> --name <String> [--authMode <String>] [--basePath <String>] [--createdByPrincipal <UUID>] [--credentialSecretName <String>] [--host <String>] [--installationId <UUID>] [--isPublished <Boolean>] [--labels <JSON>] [--lastError <String>] [--metadata <JSON>] [--platformOnly <Boolean>] [--role <String>] [--status <String>] [--updatedByPrincipal <UUID>]
```

### Get a platformRegistry by id

```bash
csdk platform-registry get --id <value>
```
