# provisionRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

## Usage

```bash
csdk provision-relation --input.clientMutationId <String> --input.databaseId <UUID> --input.relationType <String> --input.sourceTableId <UUID> --input.targetTableId <UUID> --input.fieldName <String> --input.deleteAction <String> --input.isRequired <Boolean> --input.apiRequired <Boolean> --input.createIndex <Boolean> --input.junctionTableId <UUID> --input.junctionTableName <String> --input.junctionSchemaId <UUID> --input.sourceFieldName <String> --input.targetFieldName <String> --input.useCompositeKey <Boolean> --input.exposeInApi <Boolean> --input.nodes <JSON> --input.grants <JSON> --input.grantRoles <String> --input.policies <JSON>
```

## Examples

### Run provisionRelation

```bash
csdk provision-relation --input.clientMutationId <String> --input.databaseId <UUID> --input.relationType <String> --input.sourceTableId <UUID> --input.targetTableId <UUID> --input.fieldName <String> --input.deleteAction <String> --input.isRequired <Boolean> --input.apiRequired <Boolean> --input.createIndex <Boolean> --input.junctionTableId <UUID> --input.junctionTableName <String> --input.junctionSchemaId <UUID> --input.sourceFieldName <String> --input.targetFieldName <String> --input.useCompositeKey <Boolean> --input.exposeInApi <Boolean> --input.nodes <JSON> --input.grants <JSON> --input.grantRoles <String> --input.policies <JSON>
```
