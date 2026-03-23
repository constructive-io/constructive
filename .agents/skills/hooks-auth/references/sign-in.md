# signIn

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for signIn

## Usage

```typescript
const { mutate } = useSignInMutation(); mutate({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } });
```

## Examples

### Use useSignInMutation

```typescript
const { mutate, isLoading } = useSignInMutation();
mutate({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } });
```
