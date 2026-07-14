# resetPassword

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for resetPassword

## Usage

```typescript
const { mutate } = useResetPasswordMutation(); mutate({ input: { newPassword: '<String>', resetToken: '<String>', roleId: '<UUID>' } });
```

## Examples

### Use useResetPasswordMutation

```typescript
const { mutate, isLoading } = useResetPasswordMutation();
mutate({ input: { newPassword: '<String>', resetToken: '<String>', roleId: '<UUID>' } });
```
