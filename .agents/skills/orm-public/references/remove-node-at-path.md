# removeNodeAtPath

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the removeNodeAtPath mutation

## Usage

```typescript
db.mutation.removeNodeAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>' } }).execute()
```

## Examples

### Run removeNodeAtPath

```typescript
const result = await db.mutation.removeNodeAtPath({ input: { sId: '<UUID>', root: '<UUID>', path: '<String>' } }).execute();
```
