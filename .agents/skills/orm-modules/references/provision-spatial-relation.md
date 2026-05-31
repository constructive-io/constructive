# provisionSpatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Idempotent provisioner for metaschema_public.spatial_relation. Inserts a row declaring a spatial predicate between two geometry/geography columns (owner and target). Called from construct_blueprint when a relation entry has $type=RelationSpatial. Graceful: re-running with the same (source_table_id, name) returns the existing id without modifying the row. Operator whitelist and st_dwithin ↔ param_name pairing are enforced by the spatial_relation table CHECKs. Both fields must already exist — this is a metadata-only insert.

## Usage

```typescript
db.mutation.provisionSpatialRelation({ input: '<ProvisionSpatialRelationInput>' }).execute()
```

## Examples

### Run provisionSpatialRelation

```typescript
const result = await db.mutation.provisionSpatialRelation({ input: '<ProvisionSpatialRelationInput>' }).execute();
```
