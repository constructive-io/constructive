# Upload Architecture (PostGraphile v5)

This document is the single source of truth for Constructive upload behavior across:

- `graphile/graphile-upload-plugin` (GraphQL upload field wrapping)
- `graphile/graphile-settings` (upload resolver + storage helpers)
- `graphql/server` (`POST /upload` endpoint + upload auth middleware)

It replaces the previous upload handoff notes so upload behavior is documented
in one place.

## Why This Exists

PostGraphile v5 uses Grafast plan-based execution for generated CRUD fields.
GraphQL multipart upload variables (`Upload`) are runtime values that require
streaming work before DB patch values can be written.

For CRUD updates, trying to rely on `*Upload` patch fields can fail in the plan
phase (before resolver-time upload transformation), causing:

- `"Attempted to update a record, but no new values were specified."`

The stable production pattern is now:

1. Upload file to `POST /upload` (REST multipart endpoint)
2. Patch DB row with returned metadata via normal JSON GraphQL mutation

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

`uploadResolver` and `streamToStorage` are shared by GraphQL resolver path and
REST endpoint path.

Security behavior:

- MIME type is detected from magic bytes first (`detectContentType`)
- MIME allowlist is enforced before upload persistence
- Storage upload happens through `uploadWithContentType` (no second detection pass)

This prevents writing disallowed files to object storage and avoids orphaned
objects from post-upload MIME rejection.

### 3) REST `/upload` Endpoint + Upload-Specific Auth

File:
- `graphql/server/src/middleware/upload.ts`

This file now contains both:

- `createUploadAuthenticateMiddleware(opts)`
- `uploadRoute`

`upload-auth.ts` was intentionally consolidated into `upload.ts`.

Server wiring:
- `graphql/server/src/server.ts`
  - `app.post('/upload', uploadAuthenticate, ...uploadRoute)`

#### Upload auth semantics

`/upload` is strict:

- Requires bearer token
- Returns HTTP `401` for missing/invalid auth
- Requires `req.token.user_id`

It does not rely on shared GraphQL auth behavior for anonymous fallback.

RLS module resolution for `/upload`:

1. Use `req.api.rlsModule` when present (API-scoped)
2. Fallback to database-scoped lookup by `database_id`
3. Fallback to database-scoped lookup by `dbname`

This preserves existing GraphQL route semantics while making `/upload` work for
both:

- meta API hosts (`api.localhost:3000`)
- data API hosts (`app-public-...localhost:3000`)

#### Upload endpoint behavior

Request:

- `POST /upload`
- `Content-Type: multipart/form-data`
- one file field named `file`
- `Authorization: Bearer <token>`

Success response (`200`):

```json
{
  "url": "https://bucket.s3.amazonaws.com/a8f3k2m9x1-photo.jpg",
  "filename": "photo.jpg",
  "mime": "image/jpeg",
  "size": 123456
}
```

Errors:

- `401` auth missing/invalid
- `400` no `file` field
- `413` payload too large (multer limit)

Current route file-size limit:
- `10 MB` (`graphql/server/src/middleware/upload.ts`)

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

Use two-step flow:

1. Upload file to `/upload`
2. Patch actual DB column field in JSON GraphQL mutation

Do not patch `*Upload` fields in CRUD inputs for this flow.

Upload URL derivation from GraphQL endpoint:

```ts
const uploadUrl = graphqlEndpoint.replace(/\/graphql\/?$/, '/upload');
```

Column patch shape depends on DB domain:

- `image`/`upload` (jsonb): `{ url, filename, mime }`
- `attachment` (text): `"https://..."`

## Middleware Chain (Relevant Paths)

From `graphql/server/src/server.ts`:

- `/graphql`
  - `graphqlUploadExpress()`
  - `multipartBridge`
  - shared API/auth/graphile chain
- `/upload`
  - shared API resolution (`api`)
  - upload-specific auth (`createUploadAuthenticateMiddleware`)
  - multipart parsing + storage (`uploadRoute`)

`graphqlUploadExpress` remains scoped to `/graphql` and does not interfere with
`/upload`.

## Test Coverage

Current key tests:

- `graphile/graphile-upload-plugin/__tests__/plugin.test.ts`
  - max size enforcement on resolver-consumed streams
- `graphile/graphile-settings/__tests__/upload-resolver.test.ts`
  - MIME validation before storage upload
- `graphql/server/src/middleware/__tests__/upload.test.ts`
  - upload auth behavior, fallback RLS resolution, strict auth handling

## Operational Notes

- Auth failures on `/upload` are intentionally HTTP `401` JSON errors.
- GraphQL shared auth behavior (including anon fallback patterns) is unchanged.
- This separation avoids cross-route behavior regressions while fixing data API
  upload auth.
