# provisionRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Composable relation provisioning: creates FK fields, indexes, unique constraints, and junction tables depending on the relation_type. Supports RelationBelongsTo, RelationHasOne, RelationHasMany, and RelationManyToMany. ManyToMany uses provision_table() internally for junction table creation with full node/grant/policy support. All operations are graceful (skip existing). Returns (out_field_id, out_junction_table_id, out_source_field_id, out_target_field_id).

## Usage

```typescript
db.mutation.provisionRelation({ input: '<ProvisionRelationInput>' }).execute()
```

## Examples

### Run provisionRelation

```typescript
const result = await db.mutation.provisionRelation({ input: '<ProvisionRelationInput>' }).execute();
```
