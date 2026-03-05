# orgOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of ownership transfers and grants between members

## Usage

```typescript
db.orgOwnerGrant.findMany({ select: { id: true } }).execute()
db.orgOwnerGrant.findOne({ id: '<value>', select: { id: true } }).execute()
db.orgOwnerGrant.create({ data: { isGrant: '<value>', actorId: '<value>', entityId: '<value>', grantorId: '<value>' }, select: { id: true } }).execute()
db.orgOwnerGrant.update({ where: { id: '<value>' }, data: { isGrant: '<new>' }, select: { id: true } }).execute()
db.orgOwnerGrant.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all orgOwnerGrant records

```typescript
const items = await db.orgOwnerGrant.findMany({
  select: { id: true, isGrant: true }
}).execute();
```

### Create a orgOwnerGrant

```typescript
const item = await db.orgOwnerGrant.create({
  data: { isGrant: 'value', actorId: 'value', entityId: 'value', grantorId: 'value' },
  select: { id: true }
}).execute();
```
