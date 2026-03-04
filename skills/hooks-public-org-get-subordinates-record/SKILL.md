---
name: hooks-public-org-get-subordinates-record
description: React Query hooks for OrgGetSubordinatesRecord data operations
---

# hooks-public-org-get-subordinates-record

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgGetSubordinatesRecord data operations

## Usage

```typescript
useOrgGetSubordinatesQuery({ selection: { fields: { userId: true, depth: true } } })
useCreateOrgGetSubordinatesRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all orgGetSubordinates

```typescript
const { data, isLoading } = useOrgGetSubordinatesQuery({
  selection: { fields: { userId: true, depth: true } },
});
```

### Create a orgGetSubordinatesRecord

```typescript
const { mutate } = useCreateOrgGetSubordinatesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ userId: '<value>', depth: '<value>' });
```
