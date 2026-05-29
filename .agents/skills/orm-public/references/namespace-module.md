# namespaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for NamespaceModule records

## Usage

```typescript
db.namespaceModule.findMany({ select: { id: true } }).execute()
db.namespaceModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.namespaceModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', namespacesTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespacesTableName: '<String>', namespaceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', membershipType: '<Int>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.namespaceModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.namespaceModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all namespaceModule records

```typescript
const items = await db.namespaceModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a namespaceModule

```typescript
const item = await db.namespaceModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', namespacesTableId: '<UUID>', namespaceEventsTableId: '<UUID>', namespacesTableName: '<String>', namespaceEventsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', membershipType: '<Int>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
