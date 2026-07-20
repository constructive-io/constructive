# domainModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DomainModule records

## Usage

```typescript
db.domainModule.findMany({ select: { id: true } }).execute()
db.domainModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domainModule.create({ data: { apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainEventsTableId: '<UUID>', domainEventsTableName: '<String>', domainVerificationsTableId: '<UUID>', domainVerificationsTableName: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.domainModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.domainModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all domainModule records

```typescript
const items = await db.domainModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a domainModule

```typescript
const item = await db.domainModule.create({
  data: { apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainEventsTableId: '<UUID>', domainEventsTableName: '<String>', domainVerificationsTableId: '<UUID>', domainVerificationsTableName: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
