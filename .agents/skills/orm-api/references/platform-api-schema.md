# platformApiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking API surfaces to the metaschema schemas they expose

## Usage

```typescript
db.platformApiSchema.findMany({ select: { id: true } }).execute()
db.platformApiSchema.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformApiSchema.create({ data: { apiId: '<UUID>', schemaId: '<UUID>' }, select: { id: true } }).execute()
db.platformApiSchema.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute()
db.platformApiSchema.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformApiSchema records

```typescript
const items = await db.platformApiSchema.findMany({
  select: { id: true, apiId: true }
}).execute();
```

### Create a platformApiSchema

```typescript
const item = await db.platformApiSchema.create({
  data: { apiId: '<UUID>', schemaId: '<UUID>' },
  select: { id: true }
}).execute();
```
