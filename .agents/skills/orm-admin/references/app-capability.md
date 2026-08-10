# appCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available capabilities as named bits within a bitmask, used by the RBAC system for access control

## Usage

```typescript
db.appCapability.findMany({ select: { id: true } }).execute()
db.appCapability.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appCapability.create({ data: { bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', kind: '<String>', name: '<String>' }, select: { id: true } }).execute()
db.appCapability.update({ where: { id: '<UUID>' }, data: { bitnum: '<Int>' }, select: { id: true } }).execute()
db.appCapability.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appCapability records

```typescript
const items = await db.appCapability.findMany({
  select: { id: true, bitnum: true }
}).execute();
```

### Create a appCapability

```typescript
const item = await db.appCapability.create({
  data: { bitnum: '<Int>', bitstr: '<BitString>', description: '<String>', kind: '<String>', name: '<String>' },
  select: { id: true }
}).execute();
```
