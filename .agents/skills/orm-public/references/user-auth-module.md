# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserAuthModule records

## Usage

```typescript
db.userAuthModule.findMany({ select: { id: true } }).execute()
db.userAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userAuthModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInOneTimeTokenFunction: '<String>', oneTimeTokenFunction: '<String>', extendTokenExpires: '<String>' }, select: { id: true } }).execute()
db.userAuthModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.userAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userAuthModule records

```typescript
const items = await db.userAuthModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a userAuthModule

```typescript
const item = await db.userAuthModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', emailsTableId: '<UUID>', usersTableId: '<UUID>', secretsTableId: '<UUID>', encryptedTableId: '<UUID>', sessionsTableId: '<UUID>', sessionCredentialsTableId: '<UUID>', auditsTableId: '<UUID>', auditsTableName: '<String>', signInFunction: '<String>', signUpFunction: '<String>', signOutFunction: '<String>', setPasswordFunction: '<String>', resetPasswordFunction: '<String>', forgotPasswordFunction: '<String>', sendVerificationEmailFunction: '<String>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>', checkPasswordFunction: '<String>', sendAccountDeletionEmailFunction: '<String>', deleteAccountFunction: '<String>', signInOneTimeTokenFunction: '<String>', oneTimeTokenFunction: '<String>', extendTokenExpires: '<String>' },
  select: { id: true }
}).execute();
```
