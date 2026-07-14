# signUpSms

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signUpSms mutation

## Usage

```typescript
db.mutation.signUpSms({ input: { code: '<String>', credentialKind: '<String>', deviceToken: '<String>', phone: '<String>', rememberMe: '<Boolean>' } }).execute()
```

## Examples

### Run signUpSms

```typescript
const result = await db.mutation.signUpSms({ input: { code: '<String>', credentialKind: '<String>', deviceToken: '<String>', phone: '<String>', rememberMe: '<Boolean>' } }).execute();
```
