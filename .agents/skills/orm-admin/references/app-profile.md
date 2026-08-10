# appProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named capability bundles (roles) that group multiple capabilities into reusable profiles

## Usage

```typescript
db.appProfile.findMany({ select: { id: true } }).execute()
db.appProfile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appProfile.create({ data: { capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', isSystem: '<Boolean>', name: '<String>', slug: '<String>' }, select: { id: true } }).execute()
db.appProfile.update({ where: { id: '<UUID>' }, data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.appProfile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appProfile records

```typescript
const items = await db.appProfile.findMany({
  select: { id: true, capabilities: true }
}).execute();
```

### Create a appProfile

```typescript
const item = await db.appProfile.create({
  data: { capabilities: '<BitString>', description: '<String>', isDefault: '<Boolean>', isSystem: '<Boolean>', name: '<String>', slug: '<String>' },
  select: { id: true }
}).execute();
```
