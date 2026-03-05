# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual permission grants and revocations for members via bitmask

## Usage

```typescript
db.appGrant.findMany({ select: { id: true } }).execute()
db.appGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.appGrant.create({ data: { permissions: '<value>', isGrant: '<value>', actorId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute()
db.appGrant.update({ where: { id: '<value>' }, data: { permissions: '<new>' }, select: { id: true } }).execute()
db.appGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appGrant records

```typescript
const items = await db.appGrant.findMany({
  select: { id: true, permissions: true }
}).execute();
```

### Create a appGrant

```typescript
const item = await db.appGrant.create({
  data: { permissions: 'value', isGrant: 'value', actorId: 'value', grantorId: 'value' },
  select: { id: true }
}).execute();
```
