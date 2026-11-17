# platformRepository

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Source repositories, hosted locally or on an external provider

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.platformRepository.findMany({ select: { id: true } }).execute()
db.platformRepository.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRepository.create({ data: { cloneUrl: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', defaultBranch: '<String>', description: '<String>', embedding: '<Vector>', externalId: '<String>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', provider: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformRepository.update({ where: { id: '<UUID>' }, data: { cloneUrl: '<String>' }, select: { id: true } }).execute()
db.platformRepository.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRepository records

```typescript
const items = await db.platformRepository.findMany({
  select: { id: true, cloneUrl: true }
}).execute();
```

### Create a platformRepository

```typescript
const item = await db.platformRepository.create({
  data: { cloneUrl: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', defaultBranch: '<String>', description: '<String>', embedding: '<Vector>', externalId: '<String>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', provider: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
