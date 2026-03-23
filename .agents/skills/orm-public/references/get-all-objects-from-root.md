# getAllObjectsFromRoot

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `Object`.

## Usage

```typescript
db.query.getAllObjectsFromRoot({ databaseId: '<UUID>', id: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute()
```

## Examples

### Run getAllObjectsFromRoot

```typescript
const result = await db.query.getAllObjectsFromRoot({ databaseId: '<UUID>', id: '<UUID>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```
