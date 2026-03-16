# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Schema data operations

## Usage

```typescript
useSchemasQuery({ selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, schemaNameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } } })
useSchemaQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, schemaNameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } } })
useCreateSchemaMutation({ selection: { fields: { id: true } } })
useUpdateSchemaMutation({ selection: { fields: { id: true } } })
useDeleteSchemaMutation({})
```

## Examples

### List all schemas

```typescript
const { data, isLoading } = useSchemasQuery({
  selection: { fields: { id: true, databaseId: true, name: true, schemaName: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, tags: true, isPublic: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, schemaNameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, searchScore: true } },
});
```

### Create a schema

```typescript
const { mutate } = useCreateSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', name: '<value>', schemaName: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', isPublic: '<value>', nameTrgmSimilarity: '<value>', schemaNameTrgmSimilarity: '<value>', labelTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' });
```
