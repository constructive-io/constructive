# resourceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceModule records

## Usage

```typescript
db.resourceModule.findMany({ select: { id: true } }).execute()
db.resourceModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', resourcesTableId: '<UUID>', resourceEventsTableId: '<UUID>', resourcesTableName: '<String>', resourceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute()
db.resourceModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.resourceModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceModule records

```typescript
const items = await db.resourceModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a resourceModule

```typescript
const item = await db.resourceModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', resourcesTableId: '<UUID>', resourceEventsTableId: '<UUID>', resourcesTableName: '<String>', resourceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', namespaceModuleId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' },
  select: { id: true }
}).execute();
```
