# orgProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named capability bundles (roles) that group multiple capabilities into reusable profiles

## Usage

```typescript
db.orgProfile.findMany({ select: { id: true } }).execute()
db.orgProfile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgProfile.create({ data: { capabilities: '<BitString>', description: '<String>', entityId: '<UUID>', isDefault: '<Boolean>', isSystem: '<Boolean>', name: '<String>', slug: '<String>' }, select: { id: true } }).execute()
db.orgProfile.update({ where: { id: '<UUID>' }, data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.orgProfile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgProfile records

```typescript
const items = await db.orgProfile.findMany({
  select: { id: true, capabilities: true }
}).execute();
```

### Create a orgProfile

```typescript
const item = await db.orgProfile.create({
  data: { capabilities: '<BitString>', description: '<String>', entityId: '<UUID>', isDefault: '<Boolean>', isSystem: '<Boolean>', name: '<String>', slug: '<String>' },
  select: { id: true }
}).execute();
```
