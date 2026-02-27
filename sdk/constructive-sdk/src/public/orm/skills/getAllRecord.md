# orm-getAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GetAllRecord records

## Usage

```typescript
db.getAllRecord.findMany({ select: { id: true } }).execute()
db.getAllRecord.findOne({ id: '<value>', select: { id: true } }).execute()
db.getAllRecord.create({ data: { path: '<value>', data: '<value>' }, select: { id: true } }).execute()
db.getAllRecord.update({ where: { id: '<value>' }, data: { path: '<new>' }, select: { id: true } }).execute()
db.getAllRecord.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all getAllRecord records

```typescript
const items = await db.getAllRecord.findMany({
  select: { id: true, path: true }
}).execute();
```

### Create a getAllRecord

```typescript
const item = await db.getAllRecord.create({
  data: { path: 'value', data: 'value' },
  select: { id: true }
}).execute();
```
