# appPermissionsGetByMask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppPermission`.

## Usage

```typescript
db.query.appPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute()
```

## Examples

### Run appPermissionsGetByMask

```typescript
const result = await db.query.appPermissionsGetByMask({ mask: '<BitString>', first: '<Int>', offset: '<Int>', after: '<Cursor>' }).execute();
```
