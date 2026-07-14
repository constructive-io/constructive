# relationProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions relational structure between tables. Supports four relation types:
     - RelationBelongsTo: adds a FK field on the source table referencing the target table (child perspective: "tasks belongs to projects" -> tasks.project_id).
     - RelationHasMany: adds a FK field on the target table referencing the source table (parent perspective: "projects has many tasks" -> tasks.project_id). Inverse of BelongsTo.
     - RelationHasOne: adds a FK field with a unique constraint on the source table referencing the target table. Also supports shared-primary-key patterns where the FK field IS the primary key (set field_name to the existing PK field name).
     - RelationManyToMany: creates a junction table with FK fields to both source and target tables, delegating table creation and security to secure_table_provision.
     This is a one-and-done structural provisioner. To layer additional security onto junction tables after creation, use secure_table_provision directly.
     All operations are graceful: existing fields, FK constraints, and unique constraints are reused if found.
     The trigger never injects values the caller did not provide. All security config is forwarded to secure_table_provision as-is.

## Usage

```typescript
useRelationProvisionsQuery({ selection: { fields: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } } })
useRelationProvisionQuery({ id: '<UUID>', selection: { fields: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } } })
useCreateRelationProvisionMutation({ selection: { fields: { id: true } } })
useUpdateRelationProvisionMutation({ selection: { fields: { id: true } } })
useDeleteRelationProvisionMutation({})
```

## Examples

### List all relationProvisions

```typescript
const { data, isLoading } = useRelationProvisionsQuery({
  selection: { fields: { apiRequired: true, createIndex: true, databaseId: true, deleteAction: true, exposeInApi: true, fieldName: true, grants: true, id: true, isRequired: true, junctionSchemaId: true, junctionTableId: true, junctionTableName: true, nodes: true, outFieldId: true, outJunctionTableId: true, outSourceFieldId: true, outTargetFieldId: true, policies: true, relationType: true, sourceFieldName: true, sourceTableId: true, targetFieldName: true, targetTableId: true, useCompositeKey: true } },
});
```

### Create a relationProvision

```typescript
const { mutate } = useCreateRelationProvisionMutation({
  selection: { fields: { id: true } },
});
mutate({ apiRequired: '<Boolean>', createIndex: '<Boolean>', databaseId: '<UUID>', deleteAction: '<String>', exposeInApi: '<Boolean>', fieldName: '<String>', grants: '<JSON>', isRequired: '<Boolean>', junctionSchemaId: '<UUID>', junctionTableId: '<UUID>', junctionTableName: '<String>', nodes: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>', policies: '<JSON>', relationType: '<String>', sourceFieldName: '<String>', sourceTableId: '<UUID>', targetFieldName: '<String>', targetTableId: '<UUID>', useCompositeKey: '<Boolean>' });
```
