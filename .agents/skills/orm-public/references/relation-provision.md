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
db.relationProvision.findMany({ select: { id: true } }).execute()
db.relationProvision.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.relationProvision.create({ data: { databaseId: '<UUID>', relationType: '<String>', sourceTableId: '<UUID>', targetTableId: '<UUID>', fieldName: '<String>', deleteAction: '<String>', isRequired: '<Boolean>', apiRequired: '<Boolean>', junctionTableId: '<UUID>', junctionTableName: '<String>', junctionSchemaId: '<UUID>', sourceFieldName: '<String>', targetFieldName: '<String>', useCompositeKey: '<Boolean>', createIndex: '<Boolean>', exposeInApi: '<Boolean>', nodes: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>' }, select: { id: true } }).execute()
db.relationProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.relationProvision.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all relationProvision records

```typescript
const items = await db.relationProvision.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a relationProvision

```typescript
const item = await db.relationProvision.create({
  data: { databaseId: '<UUID>', relationType: '<String>', sourceTableId: '<UUID>', targetTableId: '<UUID>', fieldName: '<String>', deleteAction: '<String>', isRequired: '<Boolean>', apiRequired: '<Boolean>', junctionTableId: '<UUID>', junctionTableName: '<String>', junctionSchemaId: '<UUID>', sourceFieldName: '<String>', targetFieldName: '<String>', useCompositeKey: '<Boolean>', createIndex: '<Boolean>', exposeInApi: '<Boolean>', nodes: '<JSON>', grants: '<JSON>', policies: '<JSON>', outFieldId: '<UUID>', outJunctionTableId: '<UUID>', outSourceFieldId: '<UUID>', outTargetFieldId: '<UUID>' },
  select: { id: true }
}).execute();
```
