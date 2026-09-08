# uploadPlatformFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Upload a file: resolves the bucket by key, creates the file row, and returns a presigned PUT URL.

## Usage

```typescript
const { mutate } = useUploadPlatformFileMutation(); mutate({ input: '<UploadPlatformFileInput>' });
```

## Examples

### Use useUploadPlatformFileMutation

```typescript
const { mutate, isLoading } = useUploadPlatformFileMutation();
mutate({ input: '<UploadPlatformFileInput>' });
```
