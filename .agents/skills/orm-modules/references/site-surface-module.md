# siteSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SiteSurfaceModule records

## Usage

```typescript
db.siteSurfaceModule.findMany({ select: { id: true } }).execute()
db.siteSurfaceModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteSurfaceModule.create({ data: { apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteAppLinksTableId: '<UUID>', siteAppLinksTableName: '<String>', siteDeepLinksTableId: '<UUID>', siteDeepLinksTableName: '<String>', siteErrorPagesTableId: '<UUID>', siteErrorPagesTableName: '<String>', siteMetadataTableId: '<UUID>', siteMetadataTableName: '<String>', siteModulesTableId: '<UUID>', siteModulesTableName: '<String>', siteReleasesTableId: '<UUID>', siteReleasesTableName: '<String>', siteThemesTableId: '<UUID>', siteThemesTableName: '<String>', siteWebConfigTableId: '<UUID>', siteWebConfigTableName: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>', storageKey: '<String>' }, select: { id: true } }).execute()
db.siteSurfaceModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.siteSurfaceModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteSurfaceModule records

```typescript
const items = await db.siteSurfaceModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a siteSurfaceModule

```typescript
const item = await db.siteSurfaceModule.create({
  data: { apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteAppLinksTableId: '<UUID>', siteAppLinksTableName: '<String>', siteDeepLinksTableId: '<UUID>', siteDeepLinksTableName: '<String>', siteErrorPagesTableId: '<UUID>', siteErrorPagesTableName: '<String>', siteMetadataTableId: '<UUID>', siteMetadataTableName: '<String>', siteModulesTableId: '<UUID>', siteModulesTableName: '<String>', siteReleasesTableId: '<UUID>', siteReleasesTableName: '<String>', siteThemesTableId: '<UUID>', siteThemesTableName: '<String>', siteWebConfigTableId: '<UUID>', siteWebConfigTableName: '<String>', sitesTableId: '<UUID>', sitesTableName: '<String>', storageKey: '<String>' },
  select: { id: true }
}).execute();
```
