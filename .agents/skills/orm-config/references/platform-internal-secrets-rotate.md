# platformInternalSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformInternalSecretsRotate mutation

## Usage

```typescript
db.mutation.platformInternalSecretsRotate({ input: { secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute()
```

## Examples

### Run platformInternalSecretsRotate

```typescript
const result = await db.mutation.platformInternalSecretsRotate({ input: { secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```
