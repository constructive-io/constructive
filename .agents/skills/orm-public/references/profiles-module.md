# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ProfilesModule records

## Usage

```typescript
db.profilesModule.findMany({ select: { id: true } }).execute()
db.profilesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.profilesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', prefix: '<String>' }, select: { id: true } }).execute()
db.profilesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.profilesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all profilesModule records

```typescript
const items = await db.profilesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a profilesModule

```typescript
const item = await db.profilesModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>', permissionsTableId: '<UUID>', membershipsTableId: '<UUID>', prefix: '<String>' },
  select: { id: true }
}).execute();
```
