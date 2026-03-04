# levelsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for LevelsModule records

## Usage

```typescript
db.levelsModule.findMany({ select: { id: true } }).execute()
db.levelsModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.levelsModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', stepsTableId: '<value>', stepsTableName: '<value>', achievementsTableId: '<value>', achievementsTableName: '<value>', levelsTableId: '<value>', levelsTableName: '<value>', levelRequirementsTableId: '<value>', levelRequirementsTableName: '<value>', completedStep: '<value>', incompletedStep: '<value>', tgAchievement: '<value>', tgAchievementToggle: '<value>', tgAchievementToggleBoolean: '<value>', tgAchievementBoolean: '<value>', upsertAchievement: '<value>', tgUpdateAchievements: '<value>', stepsRequired: '<value>', levelAchieved: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' }, select: { id: true } }).execute()
db.levelsModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.levelsModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', stepsTableId: 'value', stepsTableName: 'value', achievementsTableId: 'value', achievementsTableName: 'value', levelsTableId: 'value', levelsTableName: 'value', levelRequirementsTableId: 'value', levelRequirementsTableName: 'value', completedStep: 'value', incompletedStep: 'value', tgAchievement: 'value', tgAchievementToggle: 'value', tgAchievementToggleBoolean: 'value', tgAchievementBoolean: 'value', upsertAchievement: 'value', tgUpdateAchievements: 'value', stepsRequired: 'value', levelAchieved: 'value', prefix: 'value', membershipType: 'value', entityTableId: 'value', actorTableId: 'value' },
  select: { id: true }
}).execute();
```
