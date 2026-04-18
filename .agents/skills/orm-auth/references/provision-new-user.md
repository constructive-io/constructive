# provisionNewUser

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the provisionNewUser mutation

## Usage

```typescript
db.mutation.provisionNewUser({ input: { email: '<String>', password: '<String>' } }).execute()
```

## Examples

### Run provisionNewUser

```typescript
const result = await db.mutation.provisionNewUser({ input: { email: '<String>', password: '<String>' } }).execute();
```
