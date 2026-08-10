# eventsRequired

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppLevelRequirement`.

## Usage

```typescript
db.query.eventsRequired({ after: '<Cursor>', first: '<Int>', level: '<String>', offset: '<Int>', roleId: '<UUID>' }).execute()
```

## Examples

### Run eventsRequired

```typescript
const result = await db.query.eventsRequired({ after: '<Cursor>', first: '<Int>', level: '<String>', offset: '<Int>', roleId: '<UUID>' }).execute();
```
