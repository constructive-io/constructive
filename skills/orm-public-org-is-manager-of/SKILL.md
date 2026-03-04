---
name: orm-public-org-is-manager-of
description: Execute the orgIsManagerOf query
---

# orm-public-org-is-manager-of

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgIsManagerOf query

## Usage

```typescript
db.query.orgIsManagerOf({ pEntityId: '<value>', pManagerId: '<value>', pUserId: '<value>', pMaxDepth: '<value>' }).execute()
```

## Examples

### Run orgIsManagerOf

```typescript
const result = await db.query.orgIsManagerOf({ pEntityId: '<value>', pManagerId: '<value>', pUserId: '<value>', pMaxDepth: '<value>' }).execute();
```
