# schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SchemaGrant data operations

## Usage

```typescript
useSchemaGrantsQuery({ selection: { fields: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } } })
useSchemaGrantQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } } })
useCreateSchemaGrantMutation({ selection: { fields: { id: true } } })
useUpdateSchemaGrantMutation({ selection: { fields: { id: true } } })
useDeleteSchemaGrantMutation({})
```

## Examples

### List all schemaGrants

```typescript
const { data, isLoading } = useSchemaGrantsQuery({
  selection: { fields: { createdAt: true, databaseId: true, granteeName: true, id: true, schemaId: true, updatedAt: true } },
});
```

### Create a schemaGrant

```typescript
const { mutate } = useCreateSchemaGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', granteeName: '<String>', schemaId: '<UUID>' });
```
