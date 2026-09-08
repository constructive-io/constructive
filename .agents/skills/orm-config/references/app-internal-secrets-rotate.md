# appInternalSecretsRotate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the appInternalSecretsRotate mutation

## Usage

```typescript
db.mutation.appInternalSecretsRotate({ input: { algo: '<String>', realm: '<String>', secretName: '<String>', secretValue: '<String>' } }).execute()
```

## Examples

### Run appInternalSecretsRotate

```typescript
const result = await db.mutation.appInternalSecretsRotate({ input: { algo: '<String>', realm: '<String>', secretName: '<String>', secretValue: '<String>' } }).execute();
```
