---
name: orm-public-steps-required
description: Reads and enables pagination through a set of `AppLevelRequirement`.
---

# orm-public-steps-required

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppLevelRequirement`.

## Usage

```typescript
db.query.stepsRequired({ vlevel: '<value>', vroleId: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute()
```

## Examples

### Run stepsRequired

```typescript
const result = await db.query.stepsRequired({ vlevel: '<value>', vroleId: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
```
