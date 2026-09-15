# proposalFileView

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Files a reviewer has read, pinned to the blob they read

## Usage

```typescript
db.proposalFileView.findMany({ select: { id: true } }).execute()
db.proposalFileView.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.proposalFileView.create({ data: { blobSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', path: '<String>', proposalId: '<UUID>', reviewerId: '<UUID>', updatedByPrincipal: '<UUID>', viewedAt: '<Datetime>' }, select: { id: true } }).execute()
db.proposalFileView.update({ where: { id: '<UUID>' }, data: { blobSha: '<String>' }, select: { id: true } }).execute()
db.proposalFileView.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all proposalFileView records

```typescript
const items = await db.proposalFileView.findMany({
  select: { id: true, blobSha: true }
}).execute();
```

### Create a proposalFileView

```typescript
const item = await db.proposalFileView.create({
  data: { blobSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', path: '<String>', proposalId: '<UUID>', reviewerId: '<UUID>', updatedByPrincipal: '<UUID>', viewedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
