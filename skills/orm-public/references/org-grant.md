# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual permission grants and revocations for members via bitmask

## Usage

```typescript
db.orgGrant.findMany({ select: { id: true } }).execute()
db.orgGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgGrant.create({ data: { permissions: '<value>', isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute()
db.orgGrant.update({ where: { id: '<value>' }, data: { permissions: '<new>' }, select: { id: true } }).execute()
db.orgGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgGrant records

```typescript
const items = await db.orgGrant.findMany({
  select: { id: true, permissions: true }
}).execute();
```

### Create a orgGrant

```typescript
const item = await db.orgGrant.create({
  data: { permissions: 'value', isGrant: 'value', actorId: 'value', entityId: 'value', grantorId: 'value' },
  select: { id: true }
}).execute();
```
