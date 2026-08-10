# orgCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available capabilities as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
db.orgCapability.findMany({ select: { id: true } }).execute()
db.orgCapability.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgCapability.create({ data: { bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', kind: '<String>', name: '<String>' }, select: { id: true } }).execute()
db.orgCapability.update({ where: { id: '<UUID>' }, data: { bitnum: '<Int>' }, select: { id: true } }).execute()
db.orgCapability.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgCapability records

```typescript
const items = await db.orgCapability.findMany({
  select: { id: true, bitnum: true }
}).execute();
```

### Create a orgCapability

```typescript
const item = await db.orgCapability.create({
  data: { bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', kind: '<String>', name: '<String>' },
  select: { id: true }
}).execute();
```
