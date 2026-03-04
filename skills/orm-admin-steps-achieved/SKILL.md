---
name: orm-admin-steps-achieved
description: Execute the stepsAchieved query
---

# orm-admin-steps-achieved

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the stepsAchieved query

## Usage

```typescript
db.query.stepsAchieved({ vlevel: '<value>', vroleId: '<value>' }).execute()
```

## Examples

### Run stepsAchieved

```typescript
const result = await db.query.stepsAchieved({ vlevel: '<value>', vroleId: '<value>' }).execute();
```
