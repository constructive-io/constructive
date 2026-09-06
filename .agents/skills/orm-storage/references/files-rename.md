# filesRename

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the filesRename mutation

## Usage

```typescript
db.mutation.filesRename({ input: { fileId: '<UUID>', newFilename: '<String>' } }).execute()
```

## Examples

### Run filesRename

```typescript
const result = await db.mutation.filesRename({ input: { fileId: '<UUID>', newFilename: '<String>' } }).execute();
```
