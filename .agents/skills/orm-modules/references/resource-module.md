# resourceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceModule records

## Usage

```typescript
db.resourceModule.findMany({ select: { id: true } }).execute()
db.resourceModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', installationStoreName: '<String>', merkleStoreModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', requirementsStateViewName: '<String>', resolvedRequirementsViewName: '<String>', resourceBillingRollupFunction: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceEventsTableId: '<UUID>', resourceEventsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourceStatusChecksTableId: '<UUID>', resourceStatusChecksTableName: '<String>', resourceUsageLogTableId: '<UUID>', resourceUsageLogTableName: '<String>', resourceUsageSummaryTableId: '<UUID>', resourceUsageSummaryTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', rollupResourceUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.resourceModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.resourceModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceModule records

```typescript
const items = await db.resourceModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a resourceModule

```typescript
const item = await db.resourceModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', installationStoreName: '<String>', merkleStoreModuleId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', requirementsStateViewName: '<String>', resolvedRequirementsViewName: '<String>', resourceBillingRollupFunction: '<String>', resourceDefinitionsTableId: '<UUID>', resourceDefinitionsTableName: '<String>', resourceEventsTableId: '<UUID>', resourceEventsTableName: '<String>', resourceInstallationsTableId: '<UUID>', resourceInstallationsTableName: '<String>', resourceStatusChecksTableId: '<UUID>', resourceStatusChecksTableName: '<String>', resourceUsageLogTableId: '<UUID>', resourceUsageLogTableName: '<String>', resourceUsageSummaryTableId: '<UUID>', resourceUsageSummaryTableName: '<String>', resourcesTableId: '<UUID>', resourcesTableName: '<String>', rollupResourceUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
