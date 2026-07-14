# orgGetManagersRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgGetManagersRecord records

## Usage

```typescript
db.orgGetManagersRecord.findMany({ select: { id: true } }).execute()
db.orgGetManagersRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgGetManagersRecord.create({ data: { depth: '<Int>', userId: '<UUID>' }, select: { id: true } }).execute()
db.orgGetManagersRecord.update({ where: { id: '<UUID>' }, data: { depth: '<Int>' }, select: { id: true } }).execute()
db.orgGetManagersRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgGetManagersRecord records

```typescript
const items = await db.orgGetManagersRecord.findMany({
  select: { id: true, depth: true }
}).execute();
```

### Create a orgGetManagersRecord

```typescript
const item = await db.orgGetManagersRecord.create({
  data: { depth: '<Int>', userId: '<UUID>' },
  select: { id: true }
}).execute();
```
