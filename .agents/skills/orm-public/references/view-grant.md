# viewGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ViewGrant records

## Usage

```typescript
db.viewGrant.findMany({ select: { id: true } }).execute()
db.viewGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.viewGrant.create({ data: { databaseId: '<UUID>', viewId: '<UUID>', granteeName: '<String>', privilege: '<String>', withGrantOption: '<Boolean>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.viewGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.viewGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all viewGrant records

```typescript
const items = await db.viewGrant.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a viewGrant

```typescript
const item = await db.viewGrant.create({
  data: { databaseId: '<UUID>', viewId: '<UUID>', granteeName: '<String>', privilege: '<String>', withGrantOption: '<Boolean>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
