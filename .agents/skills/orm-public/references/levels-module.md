# levelsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for LevelsModule records

## Usage

```typescript
db.levelsModule.findMany({ select: { id: true } }).execute()
db.levelsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.levelsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', stepsTableId: '<UUID>', stepsTableName: '<String>', achievementsTableId: '<UUID>', achievementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', completedStep: '<String>', incompletedStep: '<String>', tgAchievement: '<String>', tgAchievementToggle: '<String>', tgAchievementToggleBoolean: '<String>', tgAchievementBoolean: '<String>', upsertAchievement: '<String>', tgUpdateAchievements: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' }, select: { id: true } }).execute()
db.levelsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.levelsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all levelsModule records

```typescript
const items = await db.levelsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a levelsModule

```typescript
const item = await db.levelsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', stepsTableId: '<UUID>', stepsTableName: '<String>', achievementsTableId: '<UUID>', achievementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', completedStep: '<String>', incompletedStep: '<String>', tgAchievement: '<String>', tgAchievementToggle: '<String>', tgAchievementToggleBoolean: '<String>', tgAchievementBoolean: '<String>', upsertAchievement: '<String>', tgUpdateAchievements: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
