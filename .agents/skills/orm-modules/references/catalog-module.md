# catalogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CatalogModule records

## Usage

```typescript
db.catalogModule.findMany({ select: { id: true } }).execute()
db.catalogModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.catalogModule.create({ data: { apiName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityTableId: '<UUID>', functionsTableId: '<UUID>', functionsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', schemaId: '<UUID>', scope: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>' }, select: { id: true } }).execute()
db.catalogModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.catalogModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all catalogModule records

```typescript
const items = await db.catalogModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a catalogModule

```typescript
const item = await db.catalogModule.create({
  data: { apiName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityTableId: '<UUID>', functionsTableId: '<UUID>', functionsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', schemaId: '<UUID>', scope: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>' },
  select: { id: true }
}).execute();
```
