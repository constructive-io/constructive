# apiSchema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking APIs to the database schemas they expose; controls which schemas are accessible through each API

## Usage

```typescript
useApiSchemasQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } } })
useApiSchemaQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } } })
useCreateApiSchemaMutation({ selection: { fields: { id: true } } })
useUpdateApiSchemaMutation({ selection: { fields: { id: true } } })
useDeleteApiSchemaMutation({})
```

## Examples

### List all apiSchemas

```typescript
const { data, isLoading } = useApiSchemasQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, apiId: true } },
});
```

### Create a apiSchema

```typescript
const { mutate } = useCreateApiSchemaMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', apiId: '<value>' });
```
