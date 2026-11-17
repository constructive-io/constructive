# cancelSignUpHandoff

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the cancelSignUpHandoff mutation

## Usage

```typescript
db.mutation.cancelSignUpHandoff({ input: { codeChallenge: '<String>', email: '<String>' } }).execute()
```

## Examples

### Run cancelSignUpHandoff

```typescript
const result = await db.mutation.cancelSignUpHandoff({ input: { codeChallenge: '<String>', email: '<String>' } }).execute();
```
