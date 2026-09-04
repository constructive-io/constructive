# updatePrincipal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the updatePrincipal mutation

## Usage

```typescript
db.mutation.updatePrincipal({ input: { bypassStepUp: '<Boolean>', isReadOnly: '<Boolean>', name: '<String>', principalId: '<UUID>', useAdminOwner: '<Boolean>' } }).execute()
```

## Examples

### Run updatePrincipal

```typescript
const result = await db.mutation.updatePrincipal({ input: { bypassStepUp: '<Boolean>', isReadOnly: '<Boolean>', name: '<String>', principalId: '<UUID>', useAdminOwner: '<Boolean>' } }).execute();
```
