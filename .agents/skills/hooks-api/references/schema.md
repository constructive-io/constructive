# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Schema data operations

## Usage

```typescript
useSchemasQuery({ selection: { fields: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } } })
useSchemaQuery({ id: '<UUID>', selection: { fields: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } } })
useCreateSchemaMutation({ selection: { fields: { id: true } } })
useUpdateSchemaMutation({ selection: { fields: { id: true } } })
useDeleteSchemaMutation({})
```

## Examples

### List all schemas

```typescript
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { apiExposure: true, category: true, createdAt: true, databaseId: true, description: true, id: true, isPublic: true, label: true, name: true, schemaName: true, smartTags: true, tags: true, updatedAt: true } },
});
```

### Create a schema

```typescript
const { mutate } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ apiExposure: '<ApiExposureLevel>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', isPublic: '<Boolean>', label: '<String>', name: '<String>', schemaName: '<String>', smartTags: '<JSON>', tags: '<String>' });
```
