# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual capability grants and revocations for members via bitmask

## Usage

```typescript
db.appGrant.findMany({ select: { id: true } }).execute()
db.appGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appGrant.create({ data: { actorId: '<UUID>', capabilities: '<BitString>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.appGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appGrant records

```typescript
const items = await db.appGrant.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appGrant

```typescript
const item = await db.appGrant.create({
  data: { actorId: '<UUID>', capabilities: '<BitString>', grantorId: '<UUID>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
