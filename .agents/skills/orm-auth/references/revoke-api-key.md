# revokeApiKey

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the revokeApiKey mutation

## Usage

```typescript
db.mutation.revokeApiKey({ input: { keyId: '<UUID>' } }).execute()
```

## Examples

### Run revokeApiKey

```typescript
const result = await db.mutation.revokeApiKey({ input: { keyId: '<UUID>' } }).execute();
```
