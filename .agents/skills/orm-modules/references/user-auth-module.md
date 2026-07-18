# userAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserAuthModule records

## Usage

```typescript
db.userAuthModule.findMany({ select: { id: true } }).execute()
db.userAuthModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userAuthModule.create({ data: { apiName: '<String>', auditsTableId: '<UUID>', auditsTableName: '<String>', checkPasswordFunction: '<String>', databaseId: '<UUID>', deleteAccountFunction: '<String>', emailsTableId: '<UUID>', encryptedTableId: '<UUID>', extendTokenExpires: '<String>', forgotPasswordFunction: '<String>', privateApiName: '<String>', requestCrossOriginTokenFunction: '<String>', resetPasswordFunction: '<String>', schemaId: '<UUID>', secretsTableId: '<UUID>', sendAccountDeletionEmailFunction: '<String>', sendVerificationEmailFunction: '<String>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', setPasswordFunction: '<String>', signInCrossOriginFunction: '<String>', signInFunction: '<String>', signOutFunction: '<String>', signUpFunction: '<String>', usersTableId: '<UUID>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>' }, select: { id: true } }).execute()
db.userAuthModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.userAuthModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userAuthModule records

```typescript
const items = await db.userAuthModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a userAuthModule

```typescript
const item = await db.userAuthModule.create({
  data: { apiName: '<String>', auditsTableId: '<UUID>', auditsTableName: '<String>', checkPasswordFunction: '<String>', databaseId: '<UUID>', deleteAccountFunction: '<String>', emailsTableId: '<UUID>', encryptedTableId: '<UUID>', extendTokenExpires: '<String>', forgotPasswordFunction: '<String>', privateApiName: '<String>', requestCrossOriginTokenFunction: '<String>', resetPasswordFunction: '<String>', schemaId: '<UUID>', secretsTableId: '<UUID>', sendAccountDeletionEmailFunction: '<String>', sendVerificationEmailFunction: '<String>', sessionCredentialsTableId: '<UUID>', sessionsTableId: '<UUID>', setPasswordFunction: '<String>', signInCrossOriginFunction: '<String>', signInFunction: '<String>', signOutFunction: '<String>', signUpFunction: '<String>', usersTableId: '<UUID>', verifyEmailFunction: '<String>', verifyPasswordFunction: '<String>' },
  select: { id: true }
}).execute();
```
