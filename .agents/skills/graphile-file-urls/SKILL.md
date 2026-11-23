---
name: graphile-file-urls
description: Read URLs for a file-reference column (an `image` or `upload` jsonb domain column, scalar or array) from GraphQL — `<col>Url(width)` and `<col>Versions` returning `FileVersion`, added by graphile-presigned-url-plugin. Use when asked to "show an image at a size", "get a thumbnail URL", "get the URL of an uploaded file on a row", "srcset", "why is photoUrl null", or when adding a new file-reference domain (`fileRefDomains`).
compatibility: PostGraphile v5, graphile-presigned-url-plugin, graphile-storage-registry
metadata:
  author: constructive-io
  version: "1.0.0"
---

# File-reference column URLs

Source: `graphile/graphile-presigned-url-plugin/src/file-ref-urls.ts`
(`createFileRefUrlsPlugin`, installed by `PresignedUrlPreset`).

## What you get

For every column whose type is a jsonb domain named in `FILE_REF_DOMAINS`
(`['image', 'upload']`, `graphile/graphile-storage-registry/src/naming.ts`), or
an array of one, the row type gains two fields:

```graphql
type Product {
  photo: JSON
  photoUrl(width: Int): String        # image or upload column
  photoVersions: [FileVersion!]
  gallery: [JSON]
  galleryUrl(width: Int): [String]    # array column: one entry per element
  galleryVersions: [[FileVersion!]]
}

type FileVersion {
  name: String
  key: String!
  width: Int
  height: Int
  format: String
  size: Int
  url: String!
}
```

- `<col>Url` without `width`: the source file's URL.
- `<col>Url(width: N)`: the narrowest rendered version at least `N` wide; when
  no version is that wide (or the document has none, as on an `upload`
  column), the source URL.
- `<col>Versions`: the versions in the document, narrowest first, each with a
  URL. Empty when there are none. Use it for `srcset`.
- `null` when the file id is unknown, hidden from the reader by RLS, not live,
  or its bucket is not reconciled.

```graphql
{ products { nodes { photoUrl(width: 480) photoVersions { width url } resumeUrl } } }
```

Use these on business tables. `downloadUrl` is the field on a files-table row;
it is still there and behaves the same for bucket handling (public bucket with
`publicUrlPrefix` → direct URL, private → presigned GET).

## Rules the resolver keeps

- The file row is read by the document's `id` under the reader's RLS. The
  document's own `key`, bucket and filename are ignored.
- A version is signed only if its key is a direct child of that row's
  `<source-key>.versions/` (`isVersionKeyOf`). Anything else in the document's
  `versions` is dropped.
- `.versions/` is reserved: a client-supplied upload key containing it is
  refused with `INVALID_KEY` (`src/custom-key.ts`).
- Lookups are batched per request: one files query per storage module for all
  rows of a list, not one per row.

## Adding a file type

Pass the full list as the plugin option `fileRefDomains` (`src/types.ts`), or
add the name to `FILE_REF_DOMAINS`. The domain must be a jsonb domain whose
document carries the files row `id`. Do not add a per-type plugin.

## Where versions come from

The database writes them: constructive-db's `ProcessImageVersions` lane stores
`versions` inside the image document. This plugin only reads the document; a
column with no versions still resolves `<col>Url` to the source.
