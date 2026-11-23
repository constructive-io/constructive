# repository

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Source repositories, hosted locally or on an external provider

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.repository.findMany({ select: { id: true } }).execute()
db.repository.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.repository.create({ data: { cloneUrl: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', defaultBranch: '<String>', description: '<String>', embedding: '<Vector>', externalId: '<String>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', provider: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>' }, select: { id: true } }).execute()
db.repository.update({ where: { id: '<UUID>' }, data: { cloneUrl: '<String>' }, select: { id: true } }).execute()
db.repository.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all repository records

```typescript
const items = await db.repository.findMany({
  select: { id: true, cloneUrl: true }
}).execute();
```

### Create a repository

```typescript
const item = await db.repository.create({
  data: { cloneUrl: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', defaultBranch: '<String>', description: '<String>', embedding: '<Vector>', externalId: '<String>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', provider: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
