# provisionSitePreview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the provisionSitePreview mutation

## Usage

```typescript
db.mutation.provisionSitePreview({ input: { apex: '<String>', commitId: '<UUID>', name: '<String>', siteId: '<UUID>' } }).execute()
```

## Examples

### Run provisionSitePreview

```typescript
const result = await db.mutation.provisionSitePreview({ input: { apex: '<String>', commitId: '<UUID>', name: '<String>', siteId: '<UUID>' } }).execute();
```
