# createPrincipal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the createPrincipal mutation

## Usage

```typescript
db.mutation.createPrincipal({ input: { bypassStepUp: '<Boolean>', entityIds: '<UUID>', isReadOnly: '<Boolean>', name: '<String>', useAdminOwner: '<Boolean>' } }).execute()
```

## Examples

### Run createPrincipal

```typescript
const result = await db.mutation.createPrincipal({ input: { bypassStepUp: '<Boolean>', entityIds: '<UUID>', isReadOnly: '<Boolean>', name: '<String>', useAdminOwner: '<Boolean>' } }).execute();
```
