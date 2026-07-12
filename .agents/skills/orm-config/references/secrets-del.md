# _secretsDel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the _secretsDel mutation

## Usage

```typescript
db.mutation._secretsDel({ input: { databaseId: '<UUID>', secretName: '<String>', namespaceId: '<UUID>' } }).execute()
```

## Examples

### Run _secretsDel

```typescript
const result = await db.mutation._secretsDel({ input: { databaseId: '<UUID>', secretName: '<String>', namespaceId: '<UUID>' } }).execute();
```
