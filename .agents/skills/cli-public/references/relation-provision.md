# relationProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RelationProvision records via csdk CLI

## Usage

```bash
csdk relation-provision list
csdk relation-provision list --where.<field>.<op> <value> --orderBy <values>
csdk relation-provision list --limit 10 --after <cursor>
csdk relation-provision find-first --where.<field>.<op> <value>
csdk relation-provision get --id <UUID>
csdk relation-provision create --databaseId <UUID> --relationType <String> --sourceTableId <UUID> --targetTableId <UUID> [--fieldName <String>] [--deleteAction <String>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--junctionTableId <UUID>] [--junctionTableName <String>] [--junctionSchemaId <UUID>] [--sourceFieldName <String>] [--targetFieldName <String>] [--useCompositeKey <Boolean>] [--createIndex <Boolean>] [--exposeInApi <Boolean>] [--nodeType <String>] [--nodeData <JSON>] [--grantRoles <String>] [--grantPrivileges <JSON>] [--policyType <String>] [--policyPrivileges <String>] [--policyRole <String>] [--policyPermissive <Boolean>] [--policyName <String>] [--policyData <JSON>] [--outFieldId <UUID>] [--outJunctionTableId <UUID>] [--outSourceFieldId <UUID>] [--outTargetFieldId <UUID>]
csdk relation-provision update --id <UUID> [--databaseId <UUID>] [--relationType <String>] [--sourceTableId <UUID>] [--targetTableId <UUID>] [--fieldName <String>] [--deleteAction <String>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--junctionTableId <UUID>] [--junctionTableName <String>] [--junctionSchemaId <UUID>] [--sourceFieldName <String>] [--targetFieldName <String>] [--useCompositeKey <Boolean>] [--createIndex <Boolean>] [--exposeInApi <Boolean>] [--nodeType <String>] [--nodeData <JSON>] [--grantRoles <String>] [--grantPrivileges <JSON>] [--policyType <String>] [--policyPrivileges <String>] [--policyRole <String>] [--policyPermissive <Boolean>] [--policyName <String>] [--policyData <JSON>] [--outFieldId <UUID>] [--outJunctionTableId <UUID>] [--outSourceFieldId <UUID>] [--outTargetFieldId <UUID>]
csdk relation-provision delete --id <UUID>
```

## Examples

### List relationProvision records

```bash
csdk relation-provision list
```

### List relationProvision records with pagination

```bash
csdk relation-provision list --limit 10 --offset 0
```

### List relationProvision records with cursor pagination

```bash
csdk relation-provision list --limit 10 --after <cursor>
```

### Find first matching relationProvision

```bash
csdk relation-provision find-first --where.id.equalTo <value>
```

### List relationProvision records with field selection

```bash
csdk relation-provision list --select id,id
```

### List relationProvision records with filtering and ordering

```bash
csdk relation-provision list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a relationProvision

```bash
csdk relation-provision create --databaseId <UUID> --relationType <String> --sourceTableId <UUID> --targetTableId <UUID> [--fieldName <String>] [--deleteAction <String>] [--isRequired <Boolean>] [--apiRequired <Boolean>] [--junctionTableId <UUID>] [--junctionTableName <String>] [--junctionSchemaId <UUID>] [--sourceFieldName <String>] [--targetFieldName <String>] [--useCompositeKey <Boolean>] [--createIndex <Boolean>] [--exposeInApi <Boolean>] [--nodeType <String>] [--nodeData <JSON>] [--grantRoles <String>] [--grantPrivileges <JSON>] [--policyType <String>] [--policyPrivileges <String>] [--policyRole <String>] [--policyPermissive <Boolean>] [--policyName <String>] [--policyData <JSON>] [--outFieldId <UUID>] [--outJunctionTableId <UUID>] [--outSourceFieldId <UUID>] [--outTargetFieldId <UUID>]
```

### Get a relationProvision by id

```bash
csdk relation-provision get --id <value>
```
