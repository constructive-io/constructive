# functionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table binding function definitions to API endpoints with per-binding alias and config

## Usage

```typescript
db.functionApiBinding.findMany({ select: { id: true } }).execute()
db.functionApiBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionApiBinding.create({ data: { functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' }, select: { id: true } }).execute()
db.functionApiBinding.update({ where: { id: '<UUID>' }, data: { functionDefinitionId: '<UUID>' }, select: { id: true } }).execute()
db.functionApiBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionApiBinding records

```typescript
const items = await db.functionApiBinding.findMany({
  select: { id: true, functionDefinitionId: true }
}).execute();
```

### Create a functionApiBinding

```typescript
const item = await db.functionApiBinding.create({
  data: { functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' },
  select: { id: true }
}).execute();
```
