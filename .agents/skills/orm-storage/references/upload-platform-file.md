# uploadPlatformFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Upload a file: resolves the bucket by key, creates the file row, and returns a presigned PUT URL.

## Usage

```typescript
db.mutation.uploadPlatformFile({ input: '<UploadPlatformFileInput>' }).execute()
```

## Examples

### Run uploadPlatformFile

```typescript
const result = await db.mutation.uploadPlatformFile({ input: '<UploadPlatformFileInput>' }).execute();
```
