# orgPermissionsGetByMask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `OrgPermission`.

## Usage

```typescript
db.query.orgPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute()
```

## Examples

### Run orgPermissionsGetByMask

```typescript
const result = await db.query.orgPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```
