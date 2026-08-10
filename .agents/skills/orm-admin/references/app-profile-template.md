# appProfileTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Template profiles that are automatically seeded into new entities when created

## Usage

```typescript
db.appProfileTemplate.findMany({ select: { id: true } }).execute()
db.appProfileTemplate.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appProfileTemplate.create({ data: { capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', name: '<String>', slug: '<String>' }, select: { id: true } }).execute()
db.appProfileTemplate.update({ where: { id: '<UUID>' }, data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.appProfileTemplate.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appProfileTemplate records

```typescript
const items = await db.appProfileTemplate.findMany({
  select: { id: true, capabilities: true }
}).execute();
```

### Create a appProfileTemplate

```typescript
const item = await db.appProfileTemplate.create({
  data: { capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', name: '<String>', slug: '<String>' },
  select: { id: true }
}).execute();
```
