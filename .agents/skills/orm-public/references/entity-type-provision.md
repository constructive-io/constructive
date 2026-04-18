# entityTypeProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions a new membership entity type. Each INSERT creates an entity table, registers a membership type,
     and installs the required modules (permissions, memberships, limits) plus optional modules (profiles, levels, invites).
     Uses provision_membership_table() internally. Graceful: duplicate (database_id, prefix) pairs are silently skipped
     via the unique constraint (use INSERT ... ON CONFLICT DO NOTHING).
     Policy behavior: by default the five entity-table RLS policies are applied (gated by is_visible).
     Set table_provision to a single jsonb object (using the same shape as provision_table() /
     blueprint tables[] entries) to replace the defaults with your own; set skip_entity_policies=true
     as an escape hatch to apply zero policies.

## Usage

```typescript
db.entityTypeProvision.findMany({ select: { id: true } }).execute()
db.entityTypeProvision.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.entityTypeProvision.create({ data: { databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>' }, select: { id: true } }).execute()
db.entityTypeProvision.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.entityTypeProvision.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all entityTypeProvision records

```typescript
const items = await db.entityTypeProvision.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a entityTypeProvision

```typescript
const item = await db.entityTypeProvision.create({
  data: { databaseId: '<UUID>', name: '<String>', prefix: '<String>', description: '<String>', parentEntity: '<String>', tableName: '<String>', isVisible: '<Boolean>', hasLimits: '<Boolean>', hasProfiles: '<Boolean>', hasLevels: '<Boolean>', skipEntityPolicies: '<Boolean>', tableProvision: '<JSON>', outMembershipType: '<Int>', outEntityTableId: '<UUID>', outEntityTableName: '<String>', outInstalledModules: '<String>' },
  select: { id: true }
}).execute();
```
