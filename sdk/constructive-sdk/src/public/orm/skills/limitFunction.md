# orm-limitFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for LimitFunction records

## Usage

```typescript
db.limitFunction.findMany({ select: { id: true } }).execute()
db.limitFunction.findOne({ id: '<value>', select: { id: true } }).execute()
db.limitFunction.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', data: '<value>', security: '<value>' }, select: { id: true } }).execute()
db.limitFunction.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.limitFunction.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all limitFunction records

```typescript
const items = await db.limitFunction.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a limitFunction

```typescript
const item = await db.limitFunction.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', label: 'value', description: 'value', data: 'value', security: 'value' },
  select: { id: true }
}).execute();
```
