# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ProfilesModule records

## Usage

```typescript
db.profilesModule.findMany({ select: { id: true } }).execute()
db.profilesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.profilesModule.create({ data: { actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', membershipsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.profilesModule.update({ where: { id: '<UUID>' }, data: { actorTableId: '<UUID>' }, select: { id: true } }).execute()
db.profilesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all profilesModule records

```typescript
const items = await db.profilesModule.findMany({
  select: { id: true, actorTableId: true }
}).execute();
```

### Create a profilesModule

```typescript
const item = await db.profilesModule.create({
  data: { actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', membershipsTableId: '<UUID>', permissionsTableId: '<UUID>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', profileDefinitionGrantsTableId: '<UUID>', profileDefinitionGrantsTableName: '<String>', profileGrantsTableId: '<UUID>', profileGrantsTableName: '<String>', profilePermissionsTableId: '<UUID>', profilePermissionsTableName: '<String>', profileTemplatesTableId: '<UUID>', profileTemplatesTableName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
