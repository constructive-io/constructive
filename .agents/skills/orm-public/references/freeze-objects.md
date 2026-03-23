# freezeObjects

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the freezeObjects mutation

## Usage

```typescript
db.mutation.freezeObjects({ input: { databaseId: '<UUID>', id: '<UUID>' } }).execute()
```

## Examples

### Run freezeObjects

```typescript
const result = await db.mutation.freezeObjects({ input: { databaseId: '<UUID>', id: '<UUID>' } }).execute();
```
