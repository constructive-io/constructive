---
name: hooks-public-object
description: React Query hooks for Object data operations
---

# hooks-public-object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Object data operations

## Usage

```typescript
useObjectsQuery({ selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } } })
useObjectQuery({ id: '<value>', selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } } })
useCreateObjectMutation({ selection: { fields: { id: true } } })
useUpdateObjectMutation({ selection: { fields: { id: true } } })
useDeleteObjectMutation({})
```

## Examples

### List all objects

```typescript
const { data, isLoading } = useObjectsQuery({
  selection: { fields: { hashUuid: true, id: true, databaseId: true, kids: true, ktree: true, data: true, frzn: true, createdAt: true } },
});
```

### Create a object

```typescript
const { mutate } = useCreateObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ hashUuid: '<value>', databaseId: '<value>', kids: '<value>', ktree: '<value>', data: '<value>', frzn: '<value>' });
```
