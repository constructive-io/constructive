# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Schema data operations

## Usage

```typescript
useSchemasQuery({ selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } } })
useSchemaQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } } })
useCreateSchemaMutation({ selection: { fields: { id: true } } })
useUpdateSchemaMutation({ selection: { fields: { id: true } } })
useDeleteSchemaMutation({})
```

## Examples

### List all schemas

```typescript
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true } },
});
```

### Create a schema

```typescript
const { mutate } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', name: '<String>', schemaName: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>', isPublic: '<Boolean>' });
```
