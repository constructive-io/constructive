# httpRoute

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request-time HTTP routing authority: registered domain plus path prefix and optional method to a typed target

## Usage

```typescript
db.httpRoute.findMany({ select: { id: true } }).execute()
db.httpRoute.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.httpRoute.create({ data: { createdBy: '<UUID>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetId: '<UUID>', targetKind: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.httpRoute.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.httpRoute.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all httpRoute records

```typescript
const items = await db.httpRoute.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a httpRoute

```typescript
const item = await db.httpRoute.create({
  data: { createdBy: '<UUID>', databaseId: '<UUID>', domainId: '<UUID>', isActive: '<Boolean>', method: '<String>', path: '<String>', priority: '<Int>', targetId: '<UUID>', targetKind: '<String>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
