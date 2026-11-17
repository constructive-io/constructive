# verifyEmailHandoff

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the verifyEmailHandoff mutation

## Usage

```typescript
db.mutation.verifyEmailHandoff({ input: { emailId: '<UUID>', password: '<String>', token: '<String>' } }).execute()
```

## Examples

### Run verifyEmailHandoff

```typescript
const result = await db.mutation.verifyEmailHandoff({ input: { emailId: '<UUID>', password: '<String>', token: '<String>' } }).execute();
```
