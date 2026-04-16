# stepsRequired

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppLevelRequirement`.

## Usage

```typescript
db.query.stepsRequired({ level: '<String>', roleId: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute()
```

## Examples

### Run stepsRequired

```typescript
const result = await db.query.stepsRequired({ level: '<String>', roleId: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```
