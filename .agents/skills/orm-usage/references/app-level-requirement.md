# appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the specific requirements that must be met to achieve a level

## Usage

```typescript
db.appLevelRequirement.findMany({ select: { id: true } }).execute()
db.appLevelRequirement.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLevelRequirement.create({ data: { description: '<String>', groupKey: '<String>', level: '<String>', metric: '<String>', name: '<String>', priority: '<Int>', requiredCount: '<Int>' }, select: { id: true } }).execute()
db.appLevelRequirement.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute()
db.appLevelRequirement.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLevelRequirement records

```typescript
const items = await db.appLevelRequirement.findMany({
  select: { id: true, description: true }
}).execute();
```

### Create a appLevelRequirement

```typescript
const item = await db.appLevelRequirement.create({
  data: { description: '<String>', groupKey: '<String>', level: '<String>', metric: '<String>', name: '<String>', priority: '<Int>', requiredCount: '<Int>' },
  select: { id: true }
}).execute();
```
