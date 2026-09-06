# _internalSecretsDel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _internalSecretsDel mutation

## Usage

```typescript
db.mutation._internalSecretsDel({ input: { databaseId: '<UUID>', realm: '<String>', secretName: '<String>' } }).execute()
```

## Examples

### Run _internalSecretsDel

```typescript
const result = await db.mutation._internalSecretsDel({ input: { databaseId: '<UUID>', realm: '<String>', secretName: '<String>' } }).execute();
```
