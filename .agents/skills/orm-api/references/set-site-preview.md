# setSitePreview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the setSitePreview mutation

## Usage

```typescript
db.mutation.setSitePreview({ input: { targetCommitId: '<UUID>', targetName: '<String>', targetSiteId: '<UUID>' } }).execute()
```

## Examples

### Run setSitePreview

```typescript
const result = await db.mutation.setSitePreview({ input: { targetCommitId: '<UUID>', targetName: '<String>', targetSiteId: '<UUID>' } }).execute();
```
