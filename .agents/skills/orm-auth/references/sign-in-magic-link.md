# signInMagicLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signInMagicLink mutation

## Usage

```typescript
db.mutation.signInMagicLink({ input: { credentialKind: '<String>', deviceToken: '<String>', rememberMe: '<Boolean>', token: '<String>' } }).execute()
```

## Examples

### Run signInMagicLink

```typescript
const result = await db.mutation.signInMagicLink({ input: { credentialKind: '<String>', deviceToken: '<String>', rememberMe: '<Boolean>', token: '<String>' } }).execute();
```
