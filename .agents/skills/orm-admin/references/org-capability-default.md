# orgCapabilityDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default capability bitmask assigned to new members upon joining

## Usage

```typescript
db.orgCapabilityDefault.findMany({ select: { id: true } }).execute()
db.orgCapabilityDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgCapabilityDefault.create({ data: { capabilities: '<BitString>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgCapabilityDefault.update({ where: { id: '<UUID>' }, data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.orgCapabilityDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgCapabilityDefault records

```typescript
const items = await db.orgCapabilityDefault.findMany({
  select: { id: true, capabilities: true }
}).execute();
```

### Create a orgCapabilityDefault

```typescript
const item = await db.orgCapabilityDefault.create({
  data: { capabilities: '<BitString>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
