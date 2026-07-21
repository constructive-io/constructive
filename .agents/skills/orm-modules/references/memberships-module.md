# membershipsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MembershipsModule records

## Usage

```typescript
db.membershipsModule.findMany({ select: { id: true } }).execute()
db.membershipsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.membershipsModule.create({ data: { actorMaskCheck: '<String>', actorPermCheck: '<String>', actorTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultLimitsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', entityField: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', limitsTableId: '<UUID>', memberProfilesTableId: '<UUID>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', permissionDefaultGrantsTableId: '<UUID>', permissionDefaultPermissionsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableId: '<UUID>' }, select: { id: true } }).execute()
db.membershipsModule.update({ where: { id: '<UUID>' }, data: { actorMaskCheck: '<String>' }, select: { id: true } }).execute()
db.membershipsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all membershipsModule records

```typescript
const items = await db.membershipsModule.findMany({
  select: { id: true, actorMaskCheck: true }
}).execute();
```

### Create a membershipsModule

```typescript
const item = await db.membershipsModule.create({
  data: { actorMaskCheck: '<String>', actorPermCheck: '<String>', actorTableId: '<UUID>', adminGrantsTableId: '<UUID>', adminGrantsTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultLimitsTableId: '<UUID>', defaultPermissionsTableId: '<UUID>', entityField: '<String>', entityIdsByMask: '<String>', entityIdsByPerm: '<String>', entityIdsFunction: '<String>', entityTableId: '<UUID>', entityTableOwnerId: '<UUID>', getOrgFn: '<String>', grantsTableId: '<UUID>', grantsTableName: '<String>', limitsTableId: '<UUID>', memberProfilesTableId: '<UUID>', membersTableId: '<UUID>', membersTableName: '<String>', membershipDefaultsTableId: '<UUID>', membershipDefaultsTableName: '<String>', membershipSettingsTableId: '<UUID>', membershipSettingsTableName: '<String>', membershipsTableId: '<UUID>', membershipsTableName: '<String>', ownerGrantsTableId: '<UUID>', ownerGrantsTableName: '<String>', permissionDefaultGrantsTableId: '<UUID>', permissionDefaultPermissionsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', sprtTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
