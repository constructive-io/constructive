# imageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ImageModule records

## Usage

```typescript
db.imageModule.findMany({ select: { id: true } }).execute()
db.imageModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.imageModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', imageGrantsTableId: '<UUID>', imageGrantsTableName: '<String>', imagesTableId: '<UUID>', imagesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', registriesTableId: '<UUID>', registriesTableName: '<String>', registryGrantsTableId: '<UUID>', registryGrantsTableName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.imageModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.imageModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all imageModule records

```typescript
const items = await db.imageModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a imageModule

```typescript
const item = await db.imageModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', imageGrantsTableId: '<UUID>', imageGrantsTableName: '<String>', imagesTableId: '<UUID>', imagesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', registriesTableId: '<UUID>', registriesTableName: '<String>', registryGrantsTableId: '<UUID>', registryGrantsTableName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
