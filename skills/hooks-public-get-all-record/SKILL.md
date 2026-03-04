---
name: hooks-public-get-all-record
description: React Query hooks for GetAllRecord data operations
---

# hooks-public-get-all-record

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GetAllRecord data operations

## Usage

```typescript
useGetAllQuery({ selection: { fields: { path: true, data: true } } })
useCreateGetAllRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all getAll

```typescript
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { path: true, data: true } },
});
```

### Create a getAllRecord

```typescript
const { mutate } = useCreateGetAllRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ path: '<value>', data: '<value>' });
```
