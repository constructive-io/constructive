# membershipsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MembershipsModule records

## Usage

```typescript
db.membershipsModule.findMany({ select: { id: true } }).execute()
db.membershipsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.membershipsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', prefix: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>' }, select: { id: true } }).execute()
db.membershipsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.membershipsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all membershipsModule records

```typescript
const items = await db.membershipsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a membershipsModule

```typescript
const item = await db.membershipsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', actorTableId: '<UUID>', limitsTableId: '<UUID>', defaultLimitsTableId: '<UUID>', permissionsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', sprtTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', prefix: '<String>', actorMaskCheck: '<String>', actorPermCheck: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>' },
  select: { id: true }
}).execute();
```
