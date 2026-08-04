# platformSecretsDel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSecretsDel mutation

## Usage

```typescript
db.mutation.platformSecretsDel({ input: { namespaceId: '<UUID>', realm: '<String>', secretName: '<String>' } }).execute()
```

## Examples

### Run platformSecretsDel

```typescript
const result = await db.mutation.platformSecretsDel({ input: { namespaceId: '<UUID>', realm: '<String>', secretName: '<String>' } }).execute();
```
