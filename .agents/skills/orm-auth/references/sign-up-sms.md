# signUpSms

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signUpSms mutation

## Usage

```typescript
db.mutation.signUpSms({ input: { phone: '<String>', code: '<String>', credentialKind: '<String>', rememberMe: '<Boolean>', deviceToken: '<String>' } }).execute()
```

## Examples

### Run signUpSms

```typescript
const result = await db.mutation.signUpSms({ input: { phone: '<String>', code: '<String>', credentialKind: '<String>', rememberMe: '<Boolean>', deviceToken: '<String>' } }).execute();
```
