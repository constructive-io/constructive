# oneTimeToken

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the oneTimeToken mutation

## Usage

```typescript
db.mutation.oneTimeToken({ input: { email: '<String>', password: '<String>', origin: '<Origin>', rememberMe: '<Boolean>' } }).execute()
```

## Examples

### Run oneTimeToken

```typescript
const result = await db.mutation.oneTimeToken({ input: { email: '<String>', password: '<String>', origin: '<Origin>', rememberMe: '<Boolean>' } }).execute();
```
