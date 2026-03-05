# orgGetSubordinatesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgGetSubordinatesRecord records

## Usage

```typescript
db.orgGetSubordinatesRecord.findMany({ select: { id: true } }).execute()
db.orgGetSubordinatesRecord.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgGetSubordinatesRecord.create({ data: { userId: '<value>', depth: '<value>' }, select: { id: true } }).execute()
db.orgGetSubordinatesRecord.update({ where: { id: '<value>' }, data: { userId: '<new>' }, select: { id: true } }).execute()
db.orgGetSubordinatesRecord.delete({ where: { id: '<value>' } }).execute()
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
  data: { userId: 'value', depth: 'value' },
  select: { id: true }
}).execute();
```
