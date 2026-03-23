# verifyTotp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the verifyTotp mutation

## Usage

```typescript
db.mutation.verifyTotp({ input: { totpValue: '<String>' } }).execute()
```

## Examples

### Run verifyTotp

```typescript
const result = await db.mutation.verifyTotp({ input: { totpValue: '<String>' } }).execute();
```
