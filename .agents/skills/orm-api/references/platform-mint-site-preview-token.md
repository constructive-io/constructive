# platformMintSitePreviewToken

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformMintSitePreviewToken mutation

## Usage

```typescript
db.mutation.platformMintSitePreviewToken({ input: { siteId: '<UUID>', target: '<String>', targetKind: '<String>', ttlSeconds: '<Int>' } }).execute()
```

## Examples

### Run platformMintSitePreviewToken

```typescript
const result = await db.mutation.platformMintSitePreviewToken({ input: { siteId: '<UUID>', target: '<String>', targetKind: '<String>', ttlSeconds: '<Int>' } }).execute();
```
