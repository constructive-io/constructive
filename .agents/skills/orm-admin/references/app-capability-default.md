# appCapabilityDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Stores the default capability bitmask assigned to new members upon joining

## Usage

```typescript
db.appCapabilityDefault.findMany({ select: { id: true } }).execute()
db.appCapabilityDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appCapabilityDefault.create({ data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.appCapabilityDefault.update({ where: { id: '<UUID>' }, data: { capabilities: '<BitString>' }, select: { id: true } }).execute()
db.appCapabilityDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appCapabilityDefault records

```typescript
const items = await db.appCapabilityDefault.findMany({
  select: { id: true, capabilities: true }
}).execute();
```

### Create a appCapabilityDefault

```typescript
const item = await db.appCapabilityDefault.create({
  data: { capabilities: '<BitString>' },
  select: { id: true }
}).execute();
```
