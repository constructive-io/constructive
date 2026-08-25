# @constructive-io/site-deploy

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/site-deploy"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fsite-deploy%2Fpackage.json"/></a>
</p>

Deploy a static build as an immutable Constructive release.

A deploy is **bytes plus one manifest**: every file's bytes go to the site's
bucket at `cas/sha256/<hash>`, and one `siteRelease` row maps logical paths to
those hashes. Writing that row commits the manifest into the site's own merkle
store, so the returned commit id *is* the release — publishing, rolling back and
previewing are pointer moves the server owns.

This package is the client half of that, which every consumer would otherwise
write itself: walk, hash, upload only what is missing, and commit one manifest.

## Usage

```typescript
import { deploySite } from '@constructive-io/site-deploy';

const result = await deploySite({
  api,                     // GraphQL executor for the tenant API
  siteId,
  databaseId,              // required on a site's first deploy
  bucketKey: 'site-docs',
  source: './dist',        // a directory, or the files themselves
  publish: true,           // move site.activeCommitId when it lands
});

console.log(result.commitId, result.uploaded, result.skipped);
```

Deploy a branch preview instead of going live:

```typescript
const { previewUrl } = await deploySite({
  api,
  siteId,
  bucketKey: 'site-docs',
  source: './dist',
  preview: 'pr-42',              // → preview/pr-42
  previewApex: 'preview.example.com',  // provisions pr-42--<site>.preview.example.com
});
```

Roll back — the same pointer move, to an older commit:

```typescript
import { deployNames, publishCommit } from '@constructive-io/site-deploy';

await publishCommit(api, deployNames(), siteId, previousCommitId);
```

## What it does

1. **Walks and hashes** the build, normalizing paths to POSIX and including
   dotfiles (`.well-known/…` ships); exclude explicitly with `ignore`.
2. **Detects content types** by extension, falling back to
   `application/octet-stream` rather than guessing. Override with `contentTypes`.
3. **Registers the bytes** in batches (`batchSize`, default 100) and PUTs only
   the files the server reports as *not* deduplicated, with bounded concurrency
   and retries — so a one-file change re-uploads one file.
4. **Verifies** every returned key is the `cas/sha256/<hash>` it asked for.
5. **Writes the manifest**: creates the site's release row on the first deploy,
   patches it after, and asserts the trigger stamped a `commitId`/`storeId`.
6. **Optionally publishes** and/or points `preview/<name>` at the new commit, as
   separate steps.

Ordering is the contract: bytes land before the manifest names them, and the
manifest lands before anything points at it. A failure anywhere throws a
`DeployError` with a `code` and leaves the live site untouched — an upload
failure never becomes a published manifest with holes in it.

Pass `onProgress` for `hashed` / `diffed` / `uploaded` / `manifest` / `preview` /
`published` events, `dryRun` to hash and diff only, and `skipIfUnchanged` to
reuse the live release when the tree already matches it.

## Related

- [`@constructive-io/upload-client`](../upload-client) — the generic presigned
  upload primitives this builds on.
