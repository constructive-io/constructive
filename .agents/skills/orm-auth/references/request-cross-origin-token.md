# requestCrossOriginToken

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the requestCrossOriginToken mutation

## Usage

```typescript
db.mutation.requestCrossOriginToken({ input: { email: '<String>', password: '<String>', origin: '<Origin>', rememberMe: '<Boolean>' } }).execute()
```

## Examples

### Run requestCrossOriginToken

```typescript
const result = await db.mutation.requestCrossOriginToken({ input: { email: '<String>', password: '<String>', origin: '<Origin>', rememberMe: '<Boolean>' } }).execute();
```
