# orm-trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Trigger records

## Usage

```typescript
db.trigger.findMany({ select: { id: true } }).execute()
db.trigger.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.trigger.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', event: '<value>', functionName: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute()
db.trigger.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.trigger.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all trigger records

```typescript
const items = await db.trigger.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a trigger

```typescript
const item = await db.trigger.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', event: 'value', functionName: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value' },
  select: { id: true }
}).execute();
```
