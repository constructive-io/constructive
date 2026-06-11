# Upload Architecture (PostGraphile v5)

This document is the single source of truth for Constructive upload behavior across:

- `graphile/graphile-upload-plugin` (GraphQL upload field wrapping)
- `graphile/graphile-settings` (upload resolver + storage helpers)

It replaces the previous upload handoff notes so upload behavior is documented
in one place.

## Why This Exists

PostGraphile v5 uses Grafast plan-based execution for generated CRUD fields.
GraphQL multipart upload variables (`Upload`) are runtime values that require
streaming work before DB patch values can be written.

For CRUD updates, trying to rely on `*Upload` patch fields can fail in the plan
phase (before resolver-time upload transformation), causing:

- `"Attempted to update a record, but no new values were specified."`

## Current Design

### 1) GraphQL Upload Plugin (Resolver-Based Compatibility Layer)

File:
- `graphile/graphile-upload-plugin/src/plugin.ts`

The plugin wraps v4-style resolvers and transforms `Upload` inputs before calling
the original resolver.

Key behavior:

- Resolves `Upload` promises from `args.input`
- Calls user `uploadResolver` (typically streams to S3/MinIO, returns URL/metadata)
- Rewrites input fields (`photoUpload`) into mutation-ready values
- Delegates to original resolver with modified args

#### Max file size enforcement

`maxFileSize` is enforced by wrapping `upload.createReadStream()` itself, not by
pre-reading a separate stream.

Why this matters:

- The resolver may call `createReadStream()` independently.
- Enforcement must apply to the exact stream used for persistence.
- Oversize failures are returned as controlled GraphQL errors, not process-level
  unhandled stream errors.

Related types:
- `graphile/graphile-upload-plugin/src/types.ts` (`createReadStream(): Readable`)

### 2) Upload Resolver / Storage Integration

Files:
- `graphile/graphile-settings/src/upload-resolver.ts`
- `uploads/s3-streamer/src/streamer.ts`
- `uploads/s3-streamer/src/utils.ts`

`uploadResolver` streams GraphQL upload values to configured object storage.

Security behavior:

- MIME type is detected from magic bytes first (`detectContentType`)
- MIME allowlist is enforced before upload persistence
- Storage upload happens through `uploadWithContentType` (no second detection pass)

This prevents writing disallowed files to object storage and avoids orphaned
objects from post-upload MIME rejection.

## Resolver-Based vs Plan-Based (Decision)

The upload plugin remains resolver-based on purpose.

Reasons:

- Upload preprocessing is runtime stream I/O, not a simple plan-time step.
- Auto-generated CRUD mutations in v5 are plan-only and do not allow resolver
  replacement on those fields.
- The grafserv resolver compatibility layer is currently stable for this use case.
- Upload mutations are effectively batch-size 1, so Grafast batching gains are low.
- Complexity of custom step interception is high with limited practical benefit.

Revisit if:

- Graphile publishes an official plan-native upload pattern, or
- Resolver compatibility is removed/changed materially.

## Frontend Integration Contract

Use GraphQL-backed upload flows. Do not derive a REST upload endpoint from the
GraphQL endpoint.

For domain-backed row fields, use GraphQL multipart direct upload when the
generated schema exposes `*Upload` input fields.

For storage-module file records, use presigned URL upload.

Column patch shape depends on DB domain:

- `image`/`upload` (jsonb): `{ url, filename, mime }`
- `attachment` (text): `"https://..."`

## Middleware Chain (Relevant Paths)

From `graphql/server/src/server.ts`:

- `/graphql`
  - `graphqlUploadExpress()`
  - `multipartBridge`
  - shared API/auth/graphile chain

`graphqlUploadExpress` remains scoped to `/graphql`.

## Test Coverage

Current key tests:

- `graphile/graphile-upload-plugin/__tests__/plugin.test.ts`
  - max size enforcement on resolver-consumed streams
- `graphile/graphile-settings/__tests__/upload-resolver.test.ts`
  - MIME validation before storage upload

## Removed REST `/upload` Endpoint

The historical REST `POST /upload` endpoint and its upload-specific auth
middleware have been removed from `graphql/server`.

Removed server pieces included:

- `graphql/server/src/middleware/upload.ts`
- `createUploadAuthenticateMiddleware(opts)`
- `uploadRoute`
- `multer`
- `streamToStorage()`

Clients must stop deriving upload URLs with:

```ts
const uploadUrl = graphqlEndpoint.replace(/\/graphql\/?$/, '/upload');
```

Known dashboard impact is documented in:

- `graphile/graphile-upload-plugin/DASHBOARD_UPLOAD_FOLLOWUP.md`
