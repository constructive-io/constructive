# getPathObjectsFromRoot

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `Object`.

## Usage

```typescript
db.query.getPathObjectsFromRoot({ databaseId: '<UUID>', id: '<UUID>', path: '<String>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute()
```

## Examples

### Run getPathObjectsFromRoot

```typescript
const result = await db.query.getPathObjectsFromRoot({ databaseId: '<UUID>', id: '<UUID>', path: '<String>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```
