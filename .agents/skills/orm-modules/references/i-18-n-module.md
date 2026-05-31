# i18NModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for I18NModule records

## Usage

```typescript
db.i18NModule.findMany({ select: { id: true } }).execute()
db.i18NModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.i18NModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', settingsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.i18NModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.i18NModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all i18NModule records

```typescript
const items = await db.i18NModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a i18NModule

```typescript
const item = await db.i18NModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', settingsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
