# scopeTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ScopeTypesModule records

## Usage

```typescript
db.scopeTypesModule.findMany({ select: { id: true } }).execute()
db.scopeTypesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.scopeTypesModule.create({ data: { databaseId: '<UUID>', privateSchemaName: '<String>', schemaId: '<UUID>', scopeTypesTableId: '<UUID>' }, select: { id: true } }).execute()
db.scopeTypesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.scopeTypesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all scopeTypesModule records

```typescript
const items = await db.scopeTypesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a scopeTypesModule

```typescript
const item = await db.scopeTypesModule.create({
  data: { databaseId: '<UUID>', privateSchemaName: '<String>', schemaId: '<UUID>', scopeTypesTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
