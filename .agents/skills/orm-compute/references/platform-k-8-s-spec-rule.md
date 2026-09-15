# platformK8sSpecRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Spec rulebook for DB-driven resources — merkle-versioned head over the infra store; enforced by the generated admission gate via infra_utils.check_resource_admission

## Usage

```typescript
db.platformK8sSpecRule.findMany({ select: { id: true } }).execute()
db.platformK8sSpecRule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformK8sSpecRule.create({ data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.platformK8sSpecRule.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute()
db.platformK8sSpecRule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformK8sSpecRule records

```typescript
const items = await db.platformK8sSpecRule.findMany({
  select: { id: true, active: true }
}).execute();
```

### Create a platformK8sSpecRule

```typescript
const item = await db.platformK8sSpecRule.create({
  data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
