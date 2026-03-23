# confirmDeleteAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the confirmDeleteAccount mutation

## Usage

```typescript
db.mutation.confirmDeleteAccount({ input: { userId: '<UUID>', token: '<String>' } }).execute()
```

## Examples

### Run confirmDeleteAccount

```typescript
const result = await db.mutation.confirmDeleteAccount({ input: { userId: '<UUID>', token: '<String>' } }).execute();
```
