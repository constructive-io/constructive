# signIn

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signIn mutation

## Usage

```typescript
db.mutation.signIn({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } }).execute()
```

## Examples

### Run signIn

```typescript
const result = await db.mutation.signIn({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } }).execute();
```
