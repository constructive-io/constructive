# setDataAtPath

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the setDataAtPath mutation

## Usage

```typescript
db.mutation.setDataAtPath({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute()
```

## Examples

### Run setDataAtPath

```typescript
const result = await db.mutation.setDataAtPath({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute();
```
