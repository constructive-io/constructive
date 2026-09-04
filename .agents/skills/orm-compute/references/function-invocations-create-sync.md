# functionInvocationsCreateSync

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the functionInvocationsCreateSync mutation

## Usage

```typescript
db.mutation.functionInvocationsCreateSync({ input: { entityId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', routeBindingId: '<UUID>', taskIdentifier: '<String>' } }).execute()
```

## Examples

### Run functionInvocationsCreateSync

```typescript
const result = await db.mutation.functionInvocationsCreateSync({ input: { entityId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', routeBindingId: '<UUID>', taskIdentifier: '<String>' } }).execute();
```
