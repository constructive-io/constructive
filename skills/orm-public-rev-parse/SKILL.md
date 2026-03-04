---
name: orm-public-rev-parse
description: Execute the revParse query
---

# orm-public-rev-parse

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the revParse query

## Usage

```typescript
db.query.revParse({ dbId: '<value>', storeId: '<value>', refname: '<value>' }).execute()
```

## Examples

### Run revParse

```typescript
const result = await db.query.revParse({ dbId: '<value>', storeId: '<value>', refname: '<value>' }).execute();
```
