# createOrgPrincipal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the createOrgPrincipal mutation

## Usage

```typescript
db.mutation.createOrgPrincipal({ input: { name: '<String>', orgId: '<UUID>', allowedMask: '<BitString>', isReadOnly: '<Boolean>', bypassStepUp: '<Boolean>' } }).execute()
```

## Examples

### Run createOrgPrincipal

```typescript
const result = await db.mutation.createOrgPrincipal({ input: { name: '<String>', orgId: '<UUID>', allowedMask: '<BitString>', isReadOnly: '<Boolean>', bypassStepUp: '<Boolean>' } }).execute();
```
