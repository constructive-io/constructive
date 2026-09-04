# registry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Registry records via csdk CLI

## Usage

```bash
csdk registry list
csdk registry list --where.<field>.<op> <value> --orderBy <values>
csdk registry list --limit 10 --after <cursor>
csdk registry find-first --where.<field>.<op> <value>
csdk registry get --id <UUID>
csdk registry create --databaseId <UUID> --kind <String> --name <String> [--authMode <String>] [--basePath <String>] [--createdByPrincipal <UUID>] [--credentialSecretName <String>] [--host <String>] [--installationId <UUID>] [--isPublished <Boolean>] [--labels <JSON>] [--lastError <String>] [--metadata <JSON>] [--platformOnly <Boolean>] [--role <String>] [--status <String>] [--updatedByPrincipal <UUID>]
csdk registry update --id <UUID> [--authMode <String>] [--basePath <String>] [--createdByPrincipal <UUID>] [--credentialSecretName <String>] [--databaseId <UUID>] [--host <String>] [--installationId <UUID>] [--isPublished <Boolean>] [--kind <String>] [--labels <JSON>] [--lastError <String>] [--metadata <JSON>] [--name <String>] [--platformOnly <Boolean>] [--role <String>] [--status <String>] [--updatedByPrincipal <UUID>]
csdk registry delete --id <UUID>
```

## Examples

### List registry records

```bash
csdk registry list
```

### List registry records with pagination

```bash
csdk registry list --limit 10 --offset 0
```

### List registry records with cursor pagination

```bash
csdk registry list --limit 10 --after <cursor>
```

### Find first matching registry

```bash
csdk registry find-first --where.id.equalTo <value>
```

### List registry records with field selection

```bash
csdk registry list --select id,id
```

### List registry records with filtering and ordering

```bash
csdk registry list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a registry

```bash
csdk registry create --databaseId <UUID> --kind <String> --name <String> [--authMode <String>] [--basePath <String>] [--createdByPrincipal <UUID>] [--credentialSecretName <String>] [--host <String>] [--installationId <UUID>] [--isPublished <Boolean>] [--labels <JSON>] [--lastError <String>] [--metadata <JSON>] [--platformOnly <Boolean>] [--role <String>] [--status <String>] [--updatedByPrincipal <UUID>]
```

### Get a registry by id

```bash
csdk registry get --id <value>
```
