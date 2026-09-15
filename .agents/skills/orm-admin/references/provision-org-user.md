# provisionOrgUser

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the provisionOrgUser mutation

## Usage

```typescript
db.mutation.provisionOrgUser({ input: { email: '<String>', entityId: '<UUID>', isReadOnly: '<Boolean>', phone: '<String>', profileId: '<UUID>' } }).execute()
```

## Examples

### Run provisionOrgUser

```typescript
const result = await db.mutation.provisionOrgUser({ input: { email: '<String>', entityId: '<UUID>', isReadOnly: '<Boolean>', phone: '<String>', profileId: '<UUID>' } }).execute();
```
