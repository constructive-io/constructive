# platformProposalFileView

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Files a reviewer has read, pinned to the blob they read

## Usage

```typescript
db.platformProposalFileView.findMany({ select: { id: true } }).execute()
db.platformProposalFileView.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformProposalFileView.create({ data: { blobSha: '<String>', createdByPrincipal: '<UUID>', path: '<String>', proposalId: '<UUID>', reviewerId: '<UUID>', updatedByPrincipal: '<UUID>', viewedAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformProposalFileView.update({ where: { id: '<UUID>' }, data: { blobSha: '<String>' }, select: { id: true } }).execute()
db.platformProposalFileView.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformProposalFileView records

```typescript
const items = await db.platformProposalFileView.findMany({
  select: { id: true, blobSha: true }
}).execute();
```

### Create a platformProposalFileView

```typescript
const item = await db.platformProposalFileView.create({
  data: { blobSha: '<String>', createdByPrincipal: '<UUID>', path: '<String>', proposalId: '<UUID>', reviewerId: '<UUID>', updatedByPrincipal: '<UUID>', viewedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
