# revokeSession

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the revokeSession mutation

## Usage

```typescript
db.mutation.revokeSession({ input: { sessionId: '<UUID>' } }).execute()
```

## Examples

### Run revokeSession

```typescript
const result = await db.mutation.revokeSession({ input: { sessionId: '<UUID>' } }).execute();
```
