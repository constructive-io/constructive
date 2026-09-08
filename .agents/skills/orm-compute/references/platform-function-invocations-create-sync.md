# platformFunctionInvocationsCreateSync

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformFunctionInvocationsCreateSync mutation

## Usage

```typescript
db.mutation.platformFunctionInvocationsCreateSync({ input: { entityId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', routeBindingId: '<UUID>', taskIdentifier: '<String>' } }).execute()
```

## Examples

### Run platformFunctionInvocationsCreateSync

```typescript
const result = await db.mutation.platformFunctionInvocationsCreateSync({ input: { entityId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', routeBindingId: '<UUID>', taskIdentifier: '<String>' } }).execute();
```
