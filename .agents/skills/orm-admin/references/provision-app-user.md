# provisionAppUser

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the provisionAppUser mutation

## Usage

```typescript
db.mutation.provisionAppUser({ input: { email: '<String>', phone: '<String>', profileId: '<UUID>' } }).execute()
```

## Examples

### Run provisionAppUser

```typescript
const result = await db.mutation.provisionAppUser({ input: { email: '<String>', phone: '<String>', profileId: '<UUID>' } }).execute();
```
