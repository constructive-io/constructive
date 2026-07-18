# setDataAtPath

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the setDataAtPath mutation

## Usage

```typescript
db.mutation.setDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute()
```

## Examples

### Run setDataAtPath

```typescript
const result = await db.mutation.setDataAtPath({ input: { data: '<JSON>', path: '<String>', root: '<UUID>', sId: '<UUID>' } }).execute();
```
