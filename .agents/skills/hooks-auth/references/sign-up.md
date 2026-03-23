# signUp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for signUp

## Usage

```typescript
const { mutate } = useSignUpMutation(); mutate({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } });
```

## Examples

### Use useSignUpMutation

```typescript
const { mutate, isLoading } = useSignUpMutation();
mutate({ input: { email: '<String>', password: '<String>', rememberMe: '<Boolean>', credentialKind: '<String>', csrfToken: '<String>' } });
```
