# createOrgPrincipal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the createOrgPrincipal mutation

## Usage

```typescript
db.mutation.createOrgPrincipal({ input: { bypassStepUp: '<Boolean>', isReadOnly: '<Boolean>', name: '<String>', orgId: '<UUID>', useAdminOwner: '<Boolean>' } }).execute()
```

## Examples

### Run createOrgPrincipal

```typescript
const result = await db.mutation.createOrgPrincipal({ input: { bypassStepUp: '<Boolean>', isReadOnly: '<Boolean>', name: '<String>', orgId: '<UUID>', useAdminOwner: '<Boolean>' } }).execute();
```
