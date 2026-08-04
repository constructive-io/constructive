# pagesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PagesModule records

## Usage

```typescript
db.pagesModule.findMany({ select: { id: true } }).execute()
db.pagesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.pagesModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', pagesTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', siteSurfaceModuleId: '<UUID>', sitesTableId: '<UUID>', storeNamePrefix: '<String>' }, select: { id: true } }).execute()
db.pagesModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.pagesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all pagesModule records

```typescript
const items = await db.pagesModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a pagesModule

```typescript
const item = await db.pagesModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityTableId: '<UUID>', merkleStoreModuleId: '<UUID>', pagesTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', siteSurfaceModuleId: '<UUID>', sitesTableId: '<UUID>', storeNamePrefix: '<String>' },
  select: { id: true }
}).execute();
```
