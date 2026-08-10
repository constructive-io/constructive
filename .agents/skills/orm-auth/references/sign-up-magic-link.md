# signUpMagicLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signUpMagicLink mutation

## Usage

```typescript
db.mutation.signUpMagicLink({ input: { credentialKind: '<String>', deviceToken: '<String>', rememberMe: '<Boolean>', token: '<String>' } }).execute()
```

## Examples

### Run signUpMagicLink

```typescript
const result = await db.mutation.signUpMagicLink({ input: { credentialKind: '<String>', deviceToken: '<String>', rememberMe: '<Boolean>', token: '<String>' } }).execute();
```
