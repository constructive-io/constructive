# setManyAndCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the setManyAndCommit mutation

## Usage

```typescript
db.mutation.setManyAndCommit({ input: { entries: '<JSON>', message: '<String>', refname: '<String>', sId: '<UUID>', storeId: '<UUID>' } }).execute()
```

## Examples

### Run setManyAndCommit

```typescript
const result = await db.mutation.setManyAndCommit({ input: { entries: '<JSON>', message: '<String>', refname: '<String>', sId: '<UUID>', storeId: '<UUID>' } }).execute();
```
