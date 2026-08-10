# revokeAchievement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the revokeAchievement mutation

## Usage

```typescript
db.mutation.revokeAchievement({ input: { actorId: '<UUID>', levelName: '<String>' } }).execute()
```

## Examples

### Run revokeAchievement

```typescript
const result = await db.mutation.revokeAchievement({ input: { actorId: '<UUID>', levelName: '<String>' } }).execute();
```
