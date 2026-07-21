# databaseSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DatabaseSettingsModule records

## Usage

```typescript
db.databaseSettingsModule.findMany({ select: { id: true } }).execute()
db.databaseSettingsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseSettingsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', databaseSettingsTableId: '<UUID>', databaseSettingsTableName: '<String>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', pubkeySettingsTableId: '<UUID>', pubkeySettingsTableName: '<String>', publicSchemaName: '<String>', rlsSettingsTableId: '<UUID>', rlsSettingsTableName: '<String>', schemaId: '<UUID>', scope: '<String>', webauthnSettingsTableId: '<UUID>', webauthnSettingsTableName: '<String>' }, select: { id: true } }).execute()
db.databaseSettingsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.databaseSettingsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseSettingsModule records

```typescript
const items = await db.databaseSettingsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a databaseSettingsModule

```typescript
const item = await db.databaseSettingsModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', databaseSettingsTableId: '<UUID>', databaseSettingsTableName: '<String>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', pubkeySettingsTableId: '<UUID>', pubkeySettingsTableName: '<String>', publicSchemaName: '<String>', rlsSettingsTableId: '<UUID>', rlsSettingsTableName: '<String>', schemaId: '<UUID>', scope: '<String>', webauthnSettingsTableId: '<UUID>', webauthnSettingsTableName: '<String>' },
  select: { id: true }
}).execute();
```
