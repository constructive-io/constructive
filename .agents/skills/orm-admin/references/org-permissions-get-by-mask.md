# orgPermissionsGetByMask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `OrgPermission`.

## Usage

```typescript
db.query.orgPermissionsGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute()
```

## Examples

### Run orgPermissionsGetByMask

```typescript
const result = await db.query.orgPermissionsGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute();
```
