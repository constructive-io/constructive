# functionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionApiBinding records via csdk CLI

## Usage

```bash
csdk function-api-binding list
csdk function-api-binding list --where.<field>.<op> <value> --orderBy <values>
csdk function-api-binding list --limit 10 --after <cursor>
csdk function-api-binding find-first --where.<field>.<op> <value>
csdk function-api-binding get --id <UUID>
csdk function-api-binding create --functionDefinitionId <UUID> --apiId <UUID> [--alias <String>] [--config <JSON>]
csdk function-api-binding update --id <UUID> [--functionDefinitionId <UUID>] [--apiId <UUID>] [--alias <String>] [--config <JSON>]
csdk function-api-binding delete --id <UUID>
```

## Examples

### List functionApiBinding records

```bash
csdk function-api-binding list
```

### List functionApiBinding records with pagination

```bash
csdk function-api-binding list --limit 10 --offset 0
```

### List functionApiBinding records with cursor pagination

```bash
csdk function-api-binding list --limit 10 --after <cursor>
```

### Find first matching functionApiBinding

```bash
csdk function-api-binding find-first --where.id.equalTo <value>
```

### List functionApiBinding records with field selection

```bash
csdk function-api-binding list --select id,id
```

### List functionApiBinding records with filtering and ordering

```bash
csdk function-api-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionApiBinding

```bash
csdk function-api-binding create --functionDefinitionId <UUID> --apiId <UUID> [--alias <String>] [--config <JSON>]
```

### Get a functionApiBinding by id

```bash
csdk function-api-binding get --id <value>
```
