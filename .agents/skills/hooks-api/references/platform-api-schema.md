# platformApiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking API surfaces to the metaschema schemas they expose

## Usage

```typescript
usePlatformApiSchemasQuery({ selection: { fields: { apiId: true, createdAt: true, id: true, schemaId: true, updatedAt: true } } })
usePlatformApiSchemaQuery({ id: '<UUID>', selection: { fields: { apiId: true, createdAt: true, id: true, schemaId: true, updatedAt: true } } })
useCreatePlatformApiSchemaMutation({ selection: { fields: { id: true } } })
useUpdatePlatformApiSchemaMutation({ selection: { fields: { id: true } } })
useDeletePlatformApiSchemaMutation({})
```

## Examples

### List all platformApiSchemas

```typescript
const { data, isLoading } = usePlatformApiSchemasQuery({
  selection: { fields: { apiId: true, createdAt: true, id: true, schemaId: true, updatedAt: true } },
});
```

### Create a platformApiSchema

```typescript
const { mutate } = useCreatePlatformApiSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', schemaId: '<UUID>' });
```
