# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Object records

## Usage

```typescript
db.object.findMany({ select: { id: true } }).execute()
db.object.findOne({ id: '<value>', select: { id: true } }).execute()
db.object.create({ data: { hashUuid: '<value>', databaseId: '<value>', kids: '<value>', ktree: '<value>', data: '<value>', frzn: '<value>' }, select: { id: true } }).execute()
db.object.update({ where: { id: '<value>' }, data: { hashUuid: '<new>' }, select: { id: true } }).execute()
db.object.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all object records

```typescript
const items = await db.object.findMany({
  select: { id: true, hashUuid: true }
}).execute();
```

### Create a object

```typescript
const item = await db.object.create({
  data: { hashUuid: 'value', databaseId: 'value', kids: 'value', ktree: 'value', data: 'value', frzn: 'value' },
  select: { id: true }
}).execute();
```
