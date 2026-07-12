# infraSetDataAtPath

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the infraSetDataAtPath mutation

## Usage

```typescript
db.mutation.infraSetDataAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute()
```

## Examples

### Run infraSetDataAtPath

```typescript
const result = await db.mutation.infraSetDataAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } }).execute();
```
