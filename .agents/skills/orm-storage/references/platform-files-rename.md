# platformFilesRename

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformFilesRename mutation

## Usage

```typescript
db.mutation.platformFilesRename({ input: { fileId: '<UUID>', newFilename: '<String>' } }).execute()
```

## Examples

### Run platformFilesRename

```typescript
const result = await db.mutation.platformFilesRename({ input: { fileId: '<UUID>', newFilename: '<String>' } }).execute();
```
