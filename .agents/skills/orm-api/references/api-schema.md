# apiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API

## Usage

```typescript
db.apiSchema.findMany({ select: { id: true } }).execute()
db.apiSchema.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.apiSchema.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', apiId: '<UUID>' }, select: { id: true } }).execute()
db.apiSchema.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.apiSchema.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all apiSchema records

```typescript
const items = await db.apiSchema.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a apiSchema

```typescript
const item = await db.apiSchema.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', apiId: '<UUID>' },
  select: { id: true }
}).execute();
```
