# uploadFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Upload a file: resolves the bucket by key, creates the file row, and returns a presigned PUT URL.

## Usage

```typescript
const { mutate } = useUploadFileMutation(); mutate({ input: '<UploadFileInput>' });
```

## Examples

### Use useUploadFileMutation

```typescript
const { mutate, isLoading } = useUploadFileMutation();
mutate({ input: '<UploadFileInput>' });
```
