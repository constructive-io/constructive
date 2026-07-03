# revokeOrgApiKey

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the revokeOrgApiKey mutation

## Usage

```typescript
db.mutation.revokeOrgApiKey({ input: { keyId: '<UUID>', orgId: '<UUID>' } }).execute()
```

## Examples

### Run revokeOrgApiKey

```typescript
const result = await db.mutation.revokeOrgApiKey({ input: { keyId: '<UUID>', orgId: '<UUID>' } }).execute();
```
