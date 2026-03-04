# viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DO INSTEAD rules for views (e.g., read-only enforcement)

## Usage

```typescript
db.viewRule.findMany({ select: { id: true } }).execute()
db.viewRule.findOne({ id: '<value>', select: { id: true } }).execute()
db.viewRule.create({ data: { databaseId: '<value>', viewId: '<value>', name: '<value>', event: '<value>', action: '<value>' }, select: { id: true } }).execute()
db.viewRule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.viewRule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all viewRule records

```typescript
const items = await db.viewRule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a viewRule

```typescript
const item = await db.viewRule.create({
  data: { databaseId: 'value', viewId: 'value', name: 'value', event: 'value', action: 'value' },
  select: { id: true }
}).execute();
```
