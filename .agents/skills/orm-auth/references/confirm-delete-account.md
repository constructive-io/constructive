# confirmDeleteAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the confirmDeleteAccount mutation

## Usage

```typescript
db.mutation.confirmDeleteAccount({ input: { token: '<String>', userId: '<UUID>' } }).execute()
```

## Examples

### Run confirmDeleteAccount

```typescript
const result = await db.mutation.confirmDeleteAccount({ input: { token: '<String>', userId: '<UUID>' } }).execute();
```
