# platformSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSecretsRotate mutation

## Usage

```typescript
db.mutation.platformSecretsRotate({ input: { secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute()
```

## Examples

### Run platformSecretsRotate

```typescript
const result = await db.mutation.platformSecretsRotate({ input: { secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```
