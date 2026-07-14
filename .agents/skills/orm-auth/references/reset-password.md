# resetPassword

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the resetPassword mutation

## Usage

```typescript
db.mutation.resetPassword({ input: { newPassword: '<String>', resetToken: '<String>', roleId: '<UUID>' } }).execute()
```

## Examples

### Run resetPassword

```typescript
const result = await db.mutation.resetPassword({ input: { newPassword: '<String>', resetToken: '<String>', roleId: '<UUID>' } }).execute();
```
