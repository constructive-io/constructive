# signInSmsOtp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signInSmsOtp mutation

## Usage

```typescript
db.mutation.signInSmsOtp({ input: { phone: '<String>', code: '<String>', credentialKind: '<String>', rememberMe: '<Boolean>', deviceToken: '<String>' } }).execute()
```

## Examples

### Run signInSmsOtp

```typescript
const result = await db.mutation.signInSmsOtp({ input: { phone: '<String>', code: '<String>', credentialKind: '<String>', rememberMe: '<Boolean>', deviceToken: '<String>' } }).execute();
```
