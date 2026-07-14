# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Policy records

## Usage

```typescript
db.policy.findMany({ select: { id: true } }).execute()
db.policy.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.policy.create({ data: { category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', disabled: '<Boolean>', granteeName: '<String>', name: '<String>', permissive: '<Boolean>', policyType: '<String>', privilege: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', withCheck: '<JSON>' }, select: { id: true } }).execute()
db.policy.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.policy.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all policy records

```typescript
const items = await db.policy.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a policy

```typescript
const item = await db.policy.create({
  data: { category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', disabled: '<Boolean>', granteeName: '<String>', name: '<String>', permissive: '<Boolean>', policyType: '<String>', privilege: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', withCheck: '<JSON>' },
  select: { id: true }
}).execute();
```
