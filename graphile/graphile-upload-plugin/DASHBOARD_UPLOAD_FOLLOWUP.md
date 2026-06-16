# Dashboard Upload Follow-Up

This document records dashboard impact from removing the historical Constructive
REST upload endpoint:

```text
POST /upload
```

Constructive no longer serves that endpoint. Dashboard code that derives
`/upload` from a GraphQL endpoint must migrate to a GraphQL-backed upload path.

Snapshot checked:

- `constructive`: `main` at `6d810d1b80`
- `dashboard`: `main` at `c92bd5c427`

## Affected Dashboard Runtime Code

The current dashboard `packages/sheets` package still has runtime dependencies
on REST `/upload`.

### `packages/sheets/src/hooks/use-sheets-upload.ts`

Current flow:

```text
REST /upload
-> returns { url, filename, mime, size }
-> GraphQL row update mutation patches the upload/image/attachment field
```

The code derives the endpoint with:

```ts
const uploadUrl = endpoint.replace(/\/graphql\/?$/, '/upload');
```

This will fail after the REST endpoint is removed.

### `packages/sheets/src/context/sheets-execute.ts`

`createSheetsUpload()` also derives `/upload` from the configured GraphQL
endpoint and returns `{ url }` for the caller.

This should be migrated with the hook above so sheets has one upload path.

### `packages/sheets/src/hooks/use-sheets-upload.test.ts`

The test currently expects a REST request to `/upload` followed by a GraphQL
mutation to `/graphql`.

The test should be rewritten around the replacement GraphQL upload flow.

## Not Blocking This Removal

These dashboard areas are not direct REST `/upload` dependencies:

- Admin app GraphQL upload fields such as `logoUpload`, `faviconUpload`, and
  `ogImageUpload`
- Generated SDK hooks such as `requestUploadUrl` and `confirmUpload`
- Presigned upload helpers such as `uploadAppFile` and `putToPresignedUrl`
- `packages/sheets/src/grid/editors/upload-editor.tsx`, where
  `https://example.com/uploads/...` is only a mock URL

## Recommended Migration

For sheets row fields backed by Constructive upload domains, prefer GraphQL
multipart direct upload.

Expected direction:

```text
executeFieldUpload()
-> build a GraphQL multipart request to /graphql
-> call the relevant update mutation
-> patch with <fieldName>Upload: File
-> read the updated field value from the returned row
```

This keeps the existing row-field model close to the old REST response shape:

- `image` / `upload` domains return `{ url, filename, mime }`
- `attachment` returns a URL string

Before implementing the dashboard migration, verify:

- The target generated schema exposes `<fieldName>Upload` input fields.
- Existing sheets UI code can still consume the returned field values.
- Cookie-authenticated dashboard requests satisfy `/graphql` CSRF behavior.
- Bearer-token authenticated requests continue to skip CSRF as expected.

If sheets should instead model files as storage-module records, use presigned
URL upload as a separate product/data-model migration.
