# platformInternalSecretsRemoveArray

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformInternalSecretsRemoveArray mutation

## Usage

```typescript
db.mutation.platformInternalSecretsRemoveArray({ input: { namespaceId: '<UUID>', secretNames: '<String>' } }).execute()
```

## Examples

### Run platformInternalSecretsRemoveArray

```typescript
const result = await db.mutation.platformInternalSecretsRemoveArray({ input: { namespaceId: '<UUID>', secretNames: '<String>' } }).execute();
```
