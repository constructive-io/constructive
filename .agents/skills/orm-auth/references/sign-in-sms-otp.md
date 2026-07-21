# signInSmsOtp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the signInSmsOtp mutation

## Usage

```typescript
db.mutation.signInSmsOtp({ input: { code: '<String>', credentialKind: '<String>', deviceToken: '<String>', phone: '<String>', rememberMe: '<Boolean>' } }).execute()
```

## Examples

### Run signInSmsOtp

```typescript
const result = await db.mutation.signInSmsOtp({ input: { code: '<String>', credentialKind: '<String>', deviceToken: '<String>', phone: '<String>', rememberMe: '<Boolean>' } }).execute();
```
