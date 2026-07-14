# databaseSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database-wide feature flags and settings; controls which platform features are available to all APIs in this database

## Usage

```typescript
db.databaseSetting.findMany({ select: { id: true } }).execute()
db.databaseSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseSetting.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', labels: '<JSON>', options: '<JSON>' }, select: { id: true } }).execute()
db.databaseSetting.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.databaseSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseSetting records

```typescript
const items = await db.databaseSetting.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a databaseSetting

```typescript
const item = await db.databaseSetting.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', labels: '<JSON>', options: '<JSON>' },
  select: { id: true }
}).execute();
```
