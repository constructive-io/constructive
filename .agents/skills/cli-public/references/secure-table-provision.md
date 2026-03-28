# secureTableProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SecureTableProvision records via csdk CLI

## Usage

```bash
csdk secure-table-provision list
csdk secure-table-provision list --where.<field>.<op> <value> --orderBy <values>
csdk secure-table-provision list --limit 10 --after <cursor>
csdk secure-table-provision find-first --where.<field>.<op> <value>
csdk secure-table-provision get --id <UUID>
csdk secure-table-provision create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--nodeType <String>] [--useRls <Boolean>] [--nodeData <JSON>] [--fields <JSON>] [--grantRoles <String>] [--grantPrivileges <JSON>] [--policyType <String>] [--policyPrivileges <String>] [--policyRole <String>] [--policyPermissive <Boolean>] [--policyName <String>] [--policyData <JSON>] [--outFields <UUID>]
csdk secure-table-provision update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--nodeType <String>] [--useRls <Boolean>] [--nodeData <JSON>] [--fields <JSON>] [--grantRoles <String>] [--grantPrivileges <JSON>] [--policyType <String>] [--policyPrivileges <String>] [--policyRole <String>] [--policyPermissive <Boolean>] [--policyName <String>] [--policyData <JSON>] [--outFields <UUID>]
csdk secure-table-provision delete --id <UUID>
```

## Examples

### List secureTableProvision records

```bash
csdk secure-table-provision list
```

### List secureTableProvision records with pagination

```bash
csdk secure-table-provision list --limit 10 --offset 0
```

### List secureTableProvision records with cursor pagination

```bash
csdk secure-table-provision list --limit 10 --after <cursor>
```

### Find first matching secureTableProvision

```bash
csdk secure-table-provision find-first --where.id.equalTo <value>
```

### List secureTableProvision records with field selection

```bash
csdk secure-table-provision list --select id,id
```

### List secureTableProvision records with filtering and ordering

```bash
csdk secure-table-provision list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a secureTableProvision

```bash
csdk secure-table-provision create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--nodeType <String>] [--useRls <Boolean>] [--nodeData <JSON>] [--fields <JSON>] [--grantRoles <String>] [--grantPrivileges <JSON>] [--policyType <String>] [--policyPrivileges <String>] [--policyRole <String>] [--policyPermissive <Boolean>] [--policyName <String>] [--policyData <JSON>] [--outFields <UUID>]
```

### Get a secureTableProvision by id

```bash
csdk secure-table-provision get --id <value>
```
