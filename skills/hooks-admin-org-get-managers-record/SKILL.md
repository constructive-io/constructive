---
name: hooks-admin-org-get-managers-record
description: React Query hooks for OrgGetManagersRecord data operations
---

# hooks-admin-org-get-managers-record

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgGetManagersRecord data operations

## Usage

```typescript
useOrgGetManagersQuery({ selection: { fields: { userId: true, depth: true } } })
useCreateOrgGetManagersRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all orgGetManagers

```typescript
const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { userId: true, depth: true } },
});
```

### Create a orgGetManagersRecord

```typescript
const { mutate } = useCreateOrgGetManagersRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ userId: '<value>', depth: '<value>' });
```
