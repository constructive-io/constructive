# _internalSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _internalSecretsRotate mutation

## Usage

```typescript
db.mutation._internalSecretsRotate({ input: { algo: '<String>', databaseId: '<UUID>', realm: '<String>', secretName: '<String>', secretValue: '<String>' } }).execute()
```

## Examples

### Run _internalSecretsRotate

```typescript
const result = await db.mutation._internalSecretsRotate({ input: { algo: '<String>', databaseId: '<UUID>', realm: '<String>', secretName: '<String>', secretValue: '<String>' } }).execute();
```
