---
name: orm-public-get-object-at-path
description: Execute the getObjectAtPath query
---

# orm-public-get-object-at-path

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the getObjectAtPath query

## Usage

```typescript
db.query.getObjectAtPath({ dbId: '<value>', storeId: '<value>', path: '<value>', refname: '<value>' }).execute()
```

## Examples

### Run getObjectAtPath

```typescript
const result = await db.query.getObjectAtPath({ dbId: '<value>', storeId: '<value>', path: '<value>', refname: '<value>' }).execute();
```
