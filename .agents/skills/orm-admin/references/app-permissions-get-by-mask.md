# appPermissionsGetByMask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppPermission`.

## Usage

```typescript
db.query.appPermissionsGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute()
```

## Examples

### Run appPermissionsGetByMask

```typescript
const result = await db.query.appPermissionsGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute();
```
