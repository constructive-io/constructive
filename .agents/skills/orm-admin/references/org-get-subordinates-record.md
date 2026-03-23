# orgGetSubordinatesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgGetSubordinatesRecord records

## Usage

```typescript
db.orgGetSubordinatesRecord.findMany({ select: { id: true } }).execute()
db.orgGetSubordinatesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgGetSubordinatesRecord.create({ data: { userId: '<UUID>', depth: '<Int>' }, select: { id: true } }).execute()
db.orgGetSubordinatesRecord.update({ where: { id: '<UUID>' }, data: { userId: '<UUID>' }, select: { id: true } }).execute()
db.orgGetSubordinatesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgGetSubordinatesRecord records

```typescript
const items = await db.orgGetSubordinatesRecord.findMany({
  select: { id: true, userId: true }
}).execute();
```

### Create a orgGetSubordinatesRecord

```typescript
const item = await db.orgGetSubordinatesRecord.create({
  data: { userId: '<UUID>', depth: '<Int>' },
  select: { id: true }
}).execute();
```
