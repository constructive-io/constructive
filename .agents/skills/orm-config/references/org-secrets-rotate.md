# orgSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgSecretsRotate mutation

## Usage

```typescript
db.mutation.orgSecretsRotate({ input: { ownerId: '<UUID>', secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute()
```

## Examples

### Run orgSecretsRotate

```typescript
const result = await db.mutation.orgSecretsRotate({ input: { ownerId: '<UUID>', secretName: '<String>', secretValue: '<String>', namespaceId: '<UUID>', algo: '<String>' } }).execute();
```
