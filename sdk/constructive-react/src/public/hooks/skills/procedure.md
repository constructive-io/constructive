# hooks-procedure

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Procedure data operations

## Usage

```typescript
useProceduresQuery({ selection: { fields: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useProcedureQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreateProcedureMutation({ selection: { fields: { id: true } } })
useUpdateProcedureMutation({ selection: { fields: { id: true } } })
useDeleteProcedureMutation({})
```

## Examples

### List all procedures

```typescript
const { data, isLoading } = useProceduresQuery({
  selection: { fields: { id: true, databaseId: true, name: true, argnames: true, argtypes: true, argdefaults: true, langName: true, definition: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a procedure

```typescript
const { mutate } = useCreateProcedureMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', name: '<value>', argnames: '<value>', argtypes: '<value>', argdefaults: '<value>', langName: '<value>', definition: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```
