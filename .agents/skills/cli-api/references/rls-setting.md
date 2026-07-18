# rlsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RlsSetting records via csdk CLI

## Usage

```bash
csdk rls-setting list
csdk rls-setting list --where.<field>.<op> <value> --orderBy <values>
csdk rls-setting list --limit 10 --after <cursor>
csdk rls-setting find-first --where.<field>.<op> <value>
csdk rls-setting get --id <UUID>
csdk rls-setting create --databaseId <UUID> [--authenticateFunctionId <UUID>] [--authenticateSchemaId <UUID>] [--authenticateStrictFunctionId <UUID>] [--currentIpAddressFunctionId <UUID>] [--currentRoleFunctionId <UUID>] [--currentRoleIdFunctionId <UUID>] [--currentUserAgentFunctionId <UUID>] [--roleSchemaId <UUID>]
csdk rls-setting update --id <UUID> [--authenticateFunctionId <UUID>] [--authenticateSchemaId <UUID>] [--authenticateStrictFunctionId <UUID>] [--currentIpAddressFunctionId <UUID>] [--currentRoleFunctionId <UUID>] [--currentRoleIdFunctionId <UUID>] [--currentUserAgentFunctionId <UUID>] [--databaseId <UUID>] [--roleSchemaId <UUID>]
csdk rls-setting delete --id <UUID>
```

## Examples

### List rlsSetting records

```bash
csdk rls-setting list
```

### List rlsSetting records with pagination

```bash
csdk rls-setting list --limit 10 --offset 0
```

### List rlsSetting records with cursor pagination

```bash
csdk rls-setting list --limit 10 --after <cursor>
```

### Find first matching rlsSetting

```bash
csdk rls-setting find-first --where.id.equalTo <value>
```

### List rlsSetting records with field selection

```bash
csdk rls-setting list --select id,id
```

### List rlsSetting records with filtering and ordering

```bash
csdk rls-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a rlsSetting

```bash
csdk rls-setting create --databaseId <UUID> [--authenticateFunctionId <UUID>] [--authenticateSchemaId <UUID>] [--authenticateStrictFunctionId <UUID>] [--currentIpAddressFunctionId <UUID>] [--currentRoleFunctionId <UUID>] [--currentRoleIdFunctionId <UUID>] [--currentUserAgentFunctionId <UUID>] [--roleSchemaId <UUID>]
```

### Get a rlsSetting by id

```bash
csdk rls-setting get --id <value>
```
