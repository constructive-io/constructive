# verifyEmail

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for verifyEmail

## Usage

```typescript
const { mutate } = useVerifyEmailMutation(); mutate({ input: { emailId: '<UUID>', password: '<String>', token: '<String>' } });
```

## Examples

### Use useVerifyEmailMutation

```typescript
const { mutate, isLoading } = useVerifyEmailMutation();
mutate({ input: { emailId: '<UUID>', password: '<String>', token: '<String>' } });
```
