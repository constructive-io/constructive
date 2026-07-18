# platformFunctionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table binding function definitions to API endpoints with per-binding alias and config

## Usage

```typescript
db.platformFunctionApiBinding.findMany({ select: { id: true } }).execute()
db.platformFunctionApiBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionApiBinding.create({ data: { alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' }, select: { id: true } }).execute()
db.platformFunctionApiBinding.update({ where: { id: '<UUID>' }, data: { alias: '<String>' }, select: { id: true } }).execute()
db.platformFunctionApiBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionApiBinding records

```typescript
const items = await db.platformFunctionApiBinding.findMany({
  select: { id: true, alias: true }
}).execute();
```

### Create a platformFunctionApiBinding

```typescript
const item = await db.platformFunctionApiBinding.create({
  data: { alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' },
  select: { id: true }
}).execute();
```
