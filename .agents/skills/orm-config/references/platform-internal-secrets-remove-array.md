# platformInternalSecretsRemoveArray

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformInternalSecretsRemoveArray mutation

## Usage

```typescript
db.mutation.platformInternalSecretsRemoveArray({ input: { secretNames: '<String>', namespaceId: '<UUID>' } }).execute()
```

## Examples

### Run platformInternalSecretsRemoveArray

```typescript
const result = await db.mutation.platformInternalSecretsRemoveArray({ input: { secretNames: '<String>', namespaceId: '<UUID>' } }).execute();
```
