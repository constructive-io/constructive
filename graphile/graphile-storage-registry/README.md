# graphile-storage-registry

Registry-derived storage plane discovery for PostGraphile v5.

A storage plane is a `@storageFiles` table and the `@storageBuckets` table it
writes into. This package pairs them through their **actual foreign-key
relations** in the Graphile registry (`pgRegistry.pgRelations`) — never through
table names — and derives the canonical upload surface names from the schema's
own inflection, so no physical name is ever load-bearing.

## Usage

```ts
import { discoverStoragePlanes, uploadSurfaceNames } from 'graphile-storage-registry';

const planes = discoverStoragePlanes(build.input.pgRegistry);
for (const plane of planes) {
  const names = uploadSurfaceNames(build.inflection, plane.filesCodec);
  // names.uploadMutation === 'uploadAppFile', names.bulkUploadMutation === 'uploadAppFiles', …
}
```

`discoverStoragePlanes` throws at schema build when a tagged storage table
cannot be paired:

- `STORAGE_PLANE_UNPAIRED` — a `@storageFiles` table with no FK to a
  `@storageBuckets` table, or a `@storageBuckets` table referenced by no files
  table.
- `STORAGE_PLANE_AMBIGUOUS` — a files table with FKs to more than one buckets
  table.

A plane is entity-keyed when its buckets table carries an `owner_id` attribute
(`plane.hasOwnerId`) — a registry fact, never inferred from the plane's scope
name.
