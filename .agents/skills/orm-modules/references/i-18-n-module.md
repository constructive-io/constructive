# i18NModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for I18NModule records

## Usage

```typescript
db.i18NModule.findMany({ select: { id: true } }).execute()
db.i18NModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.i18NModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', settingsTableId: '<UUID>' }, select: { id: true } }).execute()
db.i18NModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.i18NModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all i18NModule records

```typescript
const items = await db.i18NModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a i18NModule

```typescript
const item = await db.i18NModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', settingsTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
