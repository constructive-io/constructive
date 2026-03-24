# resetPassword

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the resetPassword mutation

## Usage

```typescript
db.mutation.resetPassword({ input: { roleId: '<UUID>', resetToken: '<String>', newPassword: '<String>' } }).execute()
```

## Examples

### Run resetPassword

```typescript
const result = await db.mutation.resetPassword({ input: { roleId: '<UUID>', resetToken: '<String>', newPassword: '<String>' } }).execute();
```
