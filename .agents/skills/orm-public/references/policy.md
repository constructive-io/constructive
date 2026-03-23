# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Policy records

## Usage

```typescript
db.policy.findMany({ select: { id: true } }).execute()
db.policy.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.policy.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', granteeName: '<String>', privilege: '<String>', permissive: '<Boolean>', disabled: '<Boolean>', policyType: '<String>', data: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.policy.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.policy.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all policy records

```typescript
const items = await db.policy.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a policy

```typescript
const item = await db.policy.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', granteeName: '<String>', privilege: '<String>', permissive: '<Boolean>', disabled: '<Boolean>', policyType: '<String>', data: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
