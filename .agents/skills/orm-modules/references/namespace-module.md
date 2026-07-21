# namespaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for NamespaceModule records

## Usage

```typescript
db.namespaceModule.findMany({ select: { id: true } }).execute()
db.namespaceModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.namespaceModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespaceEventsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.namespaceModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.namespaceModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all namespaceModule records

```typescript
const items = await db.namespaceModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a namespaceModule

```typescript
const item = await db.namespaceModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespaceEventsTableName: '<String>', namespacesTableId: '<UUID>', namespacesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
