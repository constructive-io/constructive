# verifyEmail

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the verifyEmail mutation

## Usage

```typescript
db.mutation.verifyEmail({ input: { emailId: '<UUID>', token: '<String>' } }).execute()
```

## Examples

### Run verifyEmail

```typescript
const result = await db.mutation.verifyEmail({ input: { emailId: '<UUID>', token: '<String>' } }).execute();
```
