# platformSecretsRemoveArray

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSecretsRemoveArray mutation

## Usage

```typescript
db.mutation.platformSecretsRemoveArray({ input: { namespaceId: '<UUID>', secretNames: '<String>' } }).execute()
```

## Examples

### Run platformSecretsRemoveArray

```typescript
const result = await db.mutation.platformSecretsRemoveArray({ input: { namespaceId: '<UUID>', secretNames: '<String>' } }).execute();
```
