# provisionRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

## Usage

```bash
csdk provision-relation --input.apiRequired <Boolean> --input.clientMutationId <String> --input.createIndex <Boolean> --input.databaseId <UUID> --input.deleteAction <String> --input.exposeInApi <Boolean> --input.fieldName <String> --input.grants <JSON> --input.isRequired <Boolean> --input.junctionSchemaId <UUID> --input.junctionTableId <UUID> --input.junctionTableName <String> --input.nodes <JSON> --input.policies <JSON> --input.relationType <String> --input.sourceFieldName <String> --input.sourceTableId <UUID> --input.targetFieldName <String> --input.targetTableId <UUID> --input.useCompositeKey <Boolean>
```

## Examples

### Run provisionRelation

```bash
csdk provision-relation --input.apiRequired <Boolean> --input.clientMutationId <String> --input.createIndex <Boolean> --input.databaseId <UUID> --input.deleteAction <String> --input.exposeInApi <Boolean> --input.fieldName <String> --input.grants <JSON> --input.isRequired <Boolean> --input.junctionSchemaId <UUID> --input.junctionTableId <UUID> --input.junctionTableName <String> --input.nodes <JSON> --input.policies <JSON> --input.relationType <String> --input.sourceFieldName <String> --input.sourceTableId <UUID> --input.targetFieldName <String> --input.targetTableId <UUID> --input.useCompositeKey <Boolean>
```
