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
csdk relation-provision create --databaseId <UUID> --relationType <String> --sourceTableId <UUID> --targetTableId <UUID> [--apiRequired <Boolean>] [--createIndex <Boolean>] [--deleteAction <String>] [--exposeInApi <Boolean>] [--fieldName <String>] [--grants <JSON>] [--isRequired <Boolean>] [--junctionSchemaId <UUID>] [--junctionTableId <UUID>] [--junctionTableName <String>] [--nodes <JSON>] [--outFieldId <UUID>] [--outJunctionTableId <UUID>] [--outSourceFieldId <UUID>] [--outTargetFieldId <UUID>] [--policies <JSON>] [--sourceFieldName <String>] [--targetFieldName <String>] [--useCompositeKey <Boolean>]
csdk relation-provision update --id <UUID> [--apiRequired <Boolean>] [--createIndex <Boolean>] [--databaseId <UUID>] [--deleteAction <String>] [--exposeInApi <Boolean>] [--fieldName <String>] [--grants <JSON>] [--isRequired <Boolean>] [--junctionSchemaId <UUID>] [--junctionTableId <UUID>] [--junctionTableName <String>] [--nodes <JSON>] [--outFieldId <UUID>] [--outJunctionTableId <UUID>] [--outSourceFieldId <UUID>] [--outTargetFieldId <UUID>] [--policies <JSON>] [--relationType <String>] [--sourceFieldName <String>] [--sourceTableId <UUID>] [--targetFieldName <String>] [--targetTableId <UUID>] [--useCompositeKey <Boolean>]
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
csdk relation-provision create --databaseId <UUID> --relationType <String> --sourceTableId <UUID> --targetTableId <UUID> [--apiRequired <Boolean>] [--createIndex <Boolean>] [--deleteAction <String>] [--exposeInApi <Boolean>] [--fieldName <String>] [--grants <JSON>] [--isRequired <Boolean>] [--junctionSchemaId <UUID>] [--junctionTableId <UUID>] [--junctionTableName <String>] [--nodes <JSON>] [--outFieldId <UUID>] [--outJunctionTableId <UUID>] [--outSourceFieldId <UUID>] [--outTargetFieldId <UUID>] [--policies <JSON>] [--sourceFieldName <String>] [--targetFieldName <String>] [--useCompositeKey <Boolean>]
```

### Get a relationProvision by id

```bash
csdk relation-provision get --id <value>
```
