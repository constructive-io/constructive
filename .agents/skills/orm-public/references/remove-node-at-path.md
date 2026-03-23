# removeNodeAtPath

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the removeNodeAtPath mutation

## Usage

```typescript
db.mutation.removeNodeAtPath({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>' } }).execute()
```

## Examples

### Run removeNodeAtPath

```typescript
const result = await db.mutation.removeNodeAtPath({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>' } }).execute();
```
