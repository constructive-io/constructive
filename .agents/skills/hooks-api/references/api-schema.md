# apiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking API surfaces to the metaschema schemas they expose

## Usage

```typescript
useApiSchemasQuery({ selection: { fields: { apiId: true, createdAt: true, databaseId: true, id: true, schemaId: true, updatedAt: true } } })
useApiSchemaQuery({ id: '<UUID>', selection: { fields: { apiId: true, createdAt: true, databaseId: true, id: true, schemaId: true, updatedAt: true } } })
useCreateApiSchemaMutation({ selection: { fields: { id: true } } })
useUpdateApiSchemaMutation({ selection: { fields: { id: true } } })
useDeleteApiSchemaMutation({})
```

## Examples

### List all apiSchemas

```typescript
const { data, isLoading } = useApiSchemasQuery({
  selection: { fields: { apiId: true, createdAt: true, databaseId: true, id: true, schemaId: true, updatedAt: true } },
});
```

### Create a apiSchema

```typescript
const { mutate } = useCreateApiSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>' });
```
