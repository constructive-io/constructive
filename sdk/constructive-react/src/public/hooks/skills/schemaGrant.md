# hooks-schemaGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for SchemaGrant data operations

## Usage

```typescript
useSchemaGrantsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } } })
useSchemaGrantQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } } })
useCreateSchemaGrantMutation({ selection: { fields: { id: true } } })
useUpdateSchemaGrantMutation({ selection: { fields: { id: true } } })
useDeleteSchemaGrantMutation({})
```

## Examples

### List all schemaGrants

```typescript
const { data, isLoading } = useSchemaGrantsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, granteeName: true, createdAt: true, updatedAt: true } },
});
```

### Create a schemaGrant

```typescript
const { mutate } = useCreateSchemaGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', granteeName: '<value>' });
```
