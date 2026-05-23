# setPropsAndCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the setPropsAndCommit mutation

## Usage

```typescript
db.mutation.setPropsAndCommit({ input: { sId: '<UUID>', storeId: '<UUID>', refname: '<String>', path: '<String>', data: '<JSON>' } }).execute()
```

## Examples

### Run setPropsAndCommit

```typescript
const result = await db.mutation.setPropsAndCommit({ input: { sId: '<UUID>', storeId: '<UUID>', refname: '<String>', path: '<String>', data: '<JSON>' } }).execute();
```
