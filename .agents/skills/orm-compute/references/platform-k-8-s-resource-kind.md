# platformK8sResourceKind

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Kubernetes kind allow-list for DB-driven resources — merkle-versioned head over the infra store; the admission gate fails closed on kinds without an active row

## Usage

```typescript
db.platformK8sResourceKind.findMany({ select: { id: true } }).execute()
db.platformK8sResourceKind.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformK8sResourceKind.create({ data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.platformK8sResourceKind.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute()
db.platformK8sResourceKind.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformK8sResourceKind records

```typescript
const items = await db.platformK8sResourceKind.findMany({
  select: { id: true, active: true }
}).execute();
```

### Create a platformK8sResourceKind

```typescript
const item = await db.platformK8sResourceKind.create({
  data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
