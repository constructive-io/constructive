# resourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceDeclaredCapacity records

## Usage

```typescript
db.resourceDeclaredCapacity.findMany({ select: { id: true } }).execute()
db.resourceDeclaredCapacity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceDeclaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.resourceDeclaredCapacity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceDeclaredCapacity records

```typescript
const items = await db.resourceDeclaredCapacity.findMany({
  select: { id: true, cpuLimitMillicores: true }
}).execute();
```
