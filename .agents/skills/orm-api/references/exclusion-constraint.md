# exclusionConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ExclusionConstraint records

## Usage

```typescript
db.exclusionConstraint.findMany({ select: { id: true } }).execute()
db.exclusionConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.exclusionConstraint.create({ data: { accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', elementExpr: '<JSON>', fieldIds: '<UUID>', name: '<String>', operators: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', whereClause: '<JSON>' }, select: { id: true } }).execute()
db.exclusionConstraint.update({ where: { id: '<UUID>' }, data: { accessMethod: '<String>' }, select: { id: true } }).execute()
db.exclusionConstraint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all exclusionConstraint records

```typescript
const items = await db.exclusionConstraint.findMany({
  select: { id: true, accessMethod: true }
}).execute();
```

### Create a exclusionConstraint

```typescript
const item = await db.exclusionConstraint.create({
  data: { accessMethod: '<String>', category: '<ObjectCategory>', databaseId: '<UUID>', elementExpr: '<JSON>', fieldIds: '<UUID>', name: '<String>', operators: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', whereClause: '<JSON>' },
  select: { id: true }
}).execute();
```
