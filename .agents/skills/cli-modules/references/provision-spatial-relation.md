# provisionSpatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert.

## Usage

```bash
csdk provision-spatial-relation --input.clientMutationId <String> --input.pDatabaseId <UUID> --input.pSourceTableId <UUID> --input.pSourceFieldId <UUID> --input.pTargetTableId <UUID> --input.pTargetFieldId <UUID> --input.pName <String> --input.pOperator <String> --input.pParamName <String>
```

## Examples

### Run provisionSpatialRelation

```bash
csdk provision-spatial-relation --input.clientMutationId <String> --input.pDatabaseId <UUID> --input.pSourceTableId <UUID> --input.pSourceFieldId <UUID> --input.pTargetTableId <UUID> --input.pTargetFieldId <UUID> --input.pName <String> --input.pOperator <String> --input.pParamName <String>
```
