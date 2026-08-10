# emailSenderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EmailSenderModule records

## Usage

```typescript
db.emailSenderModule.findMany({ select: { id: true } }).execute()
db.emailSenderModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.emailSenderModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', emailIdentitiesTableId: '<UUID>', emailIdentitiesTableName: '<String>', emailProviderAccountsTableId: '<UUID>', emailProviderAccountsTableName: '<String>', emailSiteIdentitiesTableId: '<UUID>', emailSiteIdentitiesTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteSurfaceModuleId: '<UUID>' }, select: { id: true } }).execute()
db.emailSenderModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.emailSenderModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all emailSenderModule records

```typescript
const items = await db.emailSenderModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a emailSenderModule

```typescript
const item = await db.emailSenderModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', emailIdentitiesTableId: '<UUID>', emailIdentitiesTableName: '<String>', emailProviderAccountsTableId: '<UUID>', emailProviderAccountsTableName: '<String>', emailSiteIdentitiesTableId: '<UUID>', emailSiteIdentitiesTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteSurfaceModuleId: '<UUID>' },
  select: { id: true }
}).execute();
```
