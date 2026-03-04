---
name: hooks-public-uuid-module
description: React Query hooks for UuidModule data operations
---

# hooks-public-uuid-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for UuidModule data operations

## Usage

```typescript
useUuidModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } } })
useUuidModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } } })
useCreateUuidModuleMutation({ selection: { fields: { id: true } } })
useUpdateUuidModuleMutation({ selection: { fields: { id: true } } })
useDeleteUuidModuleMutation({})
```

## Examples

### List all uuidModules

```typescript
const { data, isLoading } = useUuidModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, uuidFunction: true, uuidSeed: true } },
});
```

### Create a uuidModule

```typescript
const { mutate } = useCreateUuidModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', uuidFunction: '<value>', uuidSeed: '<value>' });
```
