# platformSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSecretsRotate mutation

## Usage

```typescript
db.mutation.platformSecretsRotate({ input: { algo: '<String>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute()
```

## Examples

### Run platformSecretsRotate

```typescript
const result = await db.mutation.platformSecretsRotate({ input: { algo: '<String>', namespaceId: '<UUID>', secretName: '<String>', secretValue: '<String>' } }).execute();
```
