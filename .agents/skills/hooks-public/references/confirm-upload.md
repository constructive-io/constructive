# confirmUpload

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Confirm that a file has been uploaded to S3.
Verifies the object exists in S3, checks content-type,
and transitions the file status from 'pending' to 'ready'.

## Usage

```typescript
const { mutate } = useConfirmUploadMutation(); mutate({ input: { fileId: '<UUID>' } });
```

## Examples

### Use useConfirmUploadMutation

```typescript
const { mutate, isLoading } = useConfirmUploadMutation();
mutate({ input: { fileId: '<UUID>' } });
```
