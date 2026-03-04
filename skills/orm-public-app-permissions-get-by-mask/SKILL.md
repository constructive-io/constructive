---
name: orm-public-app-permissions-get-by-mask
description: Reads and enables pagination through a set of `AppPermission`.
---

# orm-public-app-permissions-get-by-mask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppPermission`.

## Usage

```typescript
db.query.appPermissionsGetByMask({ mask: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute()
```

## Examples

### Run appPermissionsGetByMask

```typescript
const result = await db.query.appPermissionsGetByMask({ mask: '<value>', first: '<value>', offset: '<value>', after: '<value>' }).execute();
```
