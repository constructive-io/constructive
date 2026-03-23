# appLevel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available levels that users can achieve by completing requirements

## Usage

```typescript
db.appLevel.findMany({ select: { id: true } }).execute()
db.appLevel.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLevel.create({ data: { name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' }, select: { id: true } }).execute()
db.appLevel.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.appLevel.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLevel records

```typescript
const items = await db.appLevel.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLevel

```typescript
const item = await db.appLevel.create({
  data: { name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
