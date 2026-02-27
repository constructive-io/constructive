# orm-appMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppMembershipDefault records

## Usage

```typescript
db.appMembershipDefault.findMany({ select: { id: true } }).execute()
db.appMembershipDefault.findOne({ id: '<value>', select: { id: true } }).execute()
db.appMembershipDefault.create({ data: { createdBy: '<value>', updatedBy: '<value>', isApproved: '<value>', isVerified: '<value>' }, select: { id: true } }).execute()
db.appMembershipDefault.update({ where: { id: '<value>' }, data: { createdBy: '<new>' }, select: { id: true } }).execute()
db.appMembershipDefault.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appMembershipDefault records

```typescript
const items = await db.appMembershipDefault.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a appMembershipDefault

```typescript
const item = await db.appMembershipDefault.create({
  data: { createdBy: 'value', updatedBy: 'value', isApproved: 'value', isVerified: 'value' },
  select: { id: true }
}).execute();
```
