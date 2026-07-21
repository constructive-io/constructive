# platformInternalSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformInternalSecretsRotate mutation

## Usage

```typescript
db.mutation.platformInternalSecretsRotate({ input: { algo: '<String>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute()
```

## Examples

### Run platformInternalSecretsRotate

```typescript
const result = await db.mutation.platformInternalSecretsRotate({ input: { algo: '<String>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute();
```
