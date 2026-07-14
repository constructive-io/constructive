# platformFunctionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionApiBinding records via csdk CLI

## Usage

```bash
csdk platform-function-api-binding list
csdk platform-function-api-binding list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-api-binding list --limit 10 --after <cursor>
csdk platform-function-api-binding find-first --where.<field>.<op> <value>
csdk platform-function-api-binding get --id <UUID>
csdk platform-function-api-binding create --apiId <UUID> --functionDefinitionId <UUID> [--alias <String>] [--config <JSON>]
csdk platform-function-api-binding update --id <UUID> [--alias <String>] [--apiId <UUID>] [--config <JSON>] [--functionDefinitionId <UUID>]
csdk platform-function-api-binding delete --id <UUID>
```

## Examples

### List platformFunctionApiBinding records

```bash
csdk platform-function-api-binding list
```

### List platformFunctionApiBinding records with pagination

```bash
csdk platform-function-api-binding list --limit 10 --offset 0
```

### List platformFunctionApiBinding records with cursor pagination

```bash
csdk platform-function-api-binding list --limit 10 --after <cursor>
```

### Find first matching platformFunctionApiBinding

```bash
csdk platform-function-api-binding find-first --where.id.equalTo <value>
```

### List platformFunctionApiBinding records with field selection

```bash
csdk platform-function-api-binding list --select id,id
```

### List platformFunctionApiBinding records with filtering and ordering

```bash
csdk platform-function-api-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionApiBinding

```bash
csdk platform-function-api-binding create --apiId <UUID> --functionDefinitionId <UUID> [--alias <String>] [--config <JSON>]
```

### Get a platformFunctionApiBinding by id

```bash
csdk platform-function-api-binding get --id <value>
```
