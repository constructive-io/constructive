# signUp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signUp mutation

## Usage

```typescript
db.mutation.signUp({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } }).execute()
```

## Examples

### Run signUp

```typescript
const result = await db.mutation.signUp({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } }).execute();
```
