---
name: orm-objects-get-all-objects-from-root
description: Reads and enables pagination through a set of `Object`.
---

# orm-objects-get-all-objects-from-root

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `Object`.

## Usage

```typescript
db.query.getAllObjectsFromRoot({ databaseId: '<value>', id: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute()
```

## Examples

### Run getAllObjectsFromRoot

```typescript
const result = await db.query.getAllObjectsFromRoot({ databaseId: '<value>', id: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
```
