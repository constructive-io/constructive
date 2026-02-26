# orm-triggerFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TriggerFunction records

## Usage

```typescript
db.triggerFunction.findMany({ select: { id: true } }).execute()
db.triggerFunction.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.triggerFunction.create({ data: { databaseId: '<value>', name: '<value>', code: '<value>' }, select: { id: true } }).execute()
db.triggerFunction.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.triggerFunction.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all triggerFunction records

```typescript
const items = await db.triggerFunction.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a triggerFunction

```typescript
const item = await db.triggerFunction.create({
  data: { databaseId: 'value', name: 'value', code: 'value' },
  select: { id: true }
}).execute();
```
