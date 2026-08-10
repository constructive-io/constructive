# orgProfileTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Template profiles that are automatically seeded into new entities when created

## Usage

```typescript
db.orgProfileTemplate.findMany({ select: { id: true } }).execute()
db.orgProfileTemplate.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgProfileTemplate.create({ data: { capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', name: '<String>', slug: '<String>' }, select: { id: true } }).execute()
db.orgProfileTemplate.update({ where: { id: '<UUID>' }, data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.orgProfileTemplate.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgProfileTemplate records

```typescript
const items = await db.orgProfileTemplate.findMany({
  select: { id: true, capabilities: true }
}).execute();
```

### Create a orgProfileTemplate

```typescript
const item = await db.orgProfileTemplate.create({
  data: { capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', name: '<String>', slug: '<String>' },
  select: { id: true }
}).execute();
```
