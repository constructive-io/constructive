# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database-wide feature flags and settings; controls which platform features are available to all APIs in this database

## Usage

```typescript
db.databaseSetting.findMany({ select: { id: true } }).execute()
db.databaseSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseSetting.create({ data: { databaseId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' }, select: { id: true } }).execute()
db.databaseSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.databaseSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseSetting records

```typescript
const items = await db.databaseSetting.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a databaseSetting

```typescript
const item = await db.databaseSetting.create({
  data: { databaseId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', enableI18N: '<Boolean>', options: '<JSON>' },
  select: { id: true }
}).execute();
```
