# uploadFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Upload a file: resolves the bucket by key, creates the file row, and returns a presigned PUT URL.

## Usage

```typescript
db.mutation.uploadFile({ input: '<UploadFileInput>' }).execute()
```

## Examples

### Run uploadFile

```typescript
const result = await db.mutation.uploadFile({ input: '<UploadFileInput>' }).execute();
```
