# platformSetSitePreview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSetSitePreview mutation

## Usage

```typescript
db.mutation.platformSetSitePreview({ input: { targetCommitId: '<UUID>', targetName: '<String>', targetSiteId: '<UUID>' } }).execute()
```

## Examples

### Run platformSetSitePreview

```typescript
const result = await db.mutation.platformSetSitePreview({ input: { targetCommitId: '<UUID>', targetName: '<String>', targetSiteId: '<UUID>' } }).execute();
```
