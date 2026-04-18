# createApiKey

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the createApiKey mutation

## Usage

```typescript
db.mutation.createApiKey({ input: { keyName: '<String>', accessLevel: '<String>', mfaLevel: '<String>' } }).execute()
```

## Examples

### Run createApiKey

```typescript
const result = await db.mutation.createApiKey({ input: { keyName: '<String>', accessLevel: '<String>', mfaLevel: '<String>' } }).execute();
```
