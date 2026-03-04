# appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the specific requirements that must be met to achieve a level

## Usage

```typescript
db.appLevelRequirement.findMany({ select: { id: true } }).execute()
db.appLevelRequirement.findOne({ id: '<value>', select: { id: true } }).execute()
db.appLevelRequirement.create({ data: { name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>' }, select: { id: true } }).execute()
db.appLevelRequirement.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.appLevelRequirement.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appLevelRequirement records

```typescript
const items = await db.appLevelRequirement.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLevelRequirement

```typescript
const item = await db.appLevelRequirement.create({
  data: { name: 'value', level: 'value', description: 'value', requiredCount: 'value', priority: 'value' },
  select: { id: true }
}).execute();
```
