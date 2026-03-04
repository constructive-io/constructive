---
name: orm-public-get-path-objects-from-root
description: Reads and enables pagination through a set of `Object`.
---

# orm-public-get-path-objects-from-root

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `Object`.

## Usage

```typescript
db.query.getPathObjectsFromRoot({ databaseId: '<value>', id: '<value>', path: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute()
```

## Examples

### Run getPathObjectsFromRoot

```typescript
const result = await db.query.getPathObjectsFromRoot({ databaseId: '<value>', id: '<value>', path: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
```
