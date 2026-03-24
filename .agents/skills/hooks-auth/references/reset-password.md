# resetPassword

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for resetPassword

## Usage

```typescript
const { mutate } = useResetPasswordMutation(); mutate({ input: { roleId: '<UUID>', resetToken: '<String>', newPassword: '<String>' } });
```

## Examples

### Use useResetPasswordMutation

```typescript
const { mutate, isLoading } = useResetPasswordMutation();
mutate({ input: { roleId: '<UUID>', resetToken: '<String>', newPassword: '<String>' } });
```
