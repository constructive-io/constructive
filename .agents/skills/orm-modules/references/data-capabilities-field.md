# dataCapabilitiesField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DataCapabilitiesField records

## Usage

```typescript
db.dataCapabilitiesField.findMany({ select: { id: true } }).execute()
db.dataCapabilitiesField.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dataCapabilitiesField.create({ data: { capabilitiesModuleId: '<UUID>', databaseId: '<UUID>', fieldId: '<UUID>', fromFieldId: '<UUID>', mappingFieldId: '<UUID>', mappingKeyFieldId: '<UUID>', mappingTableId: '<UUID>', mode: '<String>', subsetGuard: '<Boolean>', tableId: '<UUID>' }, select: { id: true } }).execute()
db.dataCapabilitiesField.update({ where: { id: '<UUID>' }, data: { capabilitiesModuleId: '<UUID>' }, select: { id: true } }).execute()
db.dataCapabilitiesField.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dataCapabilitiesField records

```typescript
const items = await db.dataCapabilitiesField.findMany({
  select: { id: true, capabilitiesModuleId: true }
}).execute();
```

### Create a dataCapabilitiesField

```typescript
const item = await db.dataCapabilitiesField.create({
  data: { capabilitiesModuleId: '<UUID>', databaseId: '<UUID>', fieldId: '<UUID>', fromFieldId: '<UUID>', mappingFieldId: '<UUID>', mappingKeyFieldId: '<UUID>', mappingTableId: '<UUID>', mode: '<String>', subsetGuard: '<Boolean>', tableId: '<UUID>' },
  select: { id: true }
}).execute();
```
