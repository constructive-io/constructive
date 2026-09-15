# mintSitePreviewToken

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the mintSitePreviewToken mutation

## Usage

```typescript
db.mutation.mintSitePreviewToken({ input: { siteId: '<UUID>', target: '<String>', targetKind: '<String>', ttlSeconds: '<Int>' } }).execute()
```

## Examples

### Run mintSitePreviewToken

```typescript
const result = await db.mutation.mintSitePreviewToken({ input: { siteId: '<UUID>', target: '<String>', targetKind: '<String>', ttlSeconds: '<Int>' } }).execute();
```
