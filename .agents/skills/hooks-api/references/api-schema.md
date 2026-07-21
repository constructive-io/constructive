# apiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API

## Usage

```typescript
useApiSchemasQuery({ selection: { fields: { apiId: true, databaseId: true, id: true, schemaId: true } } })
useApiSchemaQuery({ id: '<UUID>', selection: { fields: { apiId: true, databaseId: true, id: true, schemaId: true } } })
useCreateApiSchemaMutation({ selection: { fields: { id: true } } })
useUpdateApiSchemaMutation({ selection: { fields: { id: true } } })
useDeleteApiSchemaMutation({})
```

## Examples

### List all apiSchemas

```typescript
const { data, isLoading } = useApiSchemasQuery({
  selection: { fields: { apiId: true, databaseId: true, id: true, schemaId: true } },
});
```

### Create a apiSchema

```typescript
const { mutate } = useCreateApiSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ apiId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>' });
```
