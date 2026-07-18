# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Table data operations

## Usage

```typescript
useTablesQuery({ selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } } })
useTableQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } } })
useCreateTableMutation({ selection: { fields: { id: true } } })
useUpdateTableMutation({ selection: { fields: { id: true } } })
useDeleteTableMutation({})
```

## Examples

### List all tables

```typescript
const { data, isLoading } = useTablesQuery({
  selection: { fields: { category: true, createdAt: true, databaseId: true, description: true, id: true, inheritsId: true, label: true, name: true, partitionKeyNames: true, partitionKeyTypes: true, partitionStrategy: true, partitioned: true, peoplestamps: true, pluralName: true, schemaId: true, singularName: true, smartTags: true, stepUp: true, tags: true, timestamps: true, updatedAt: true, useRls: true } },
});
```

### Create a table

```typescript
const { mutate } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', inheritsId: '<UUID>', label: '<String>', name: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', partitionStrategy: '<String>', partitioned: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', schemaId: '<UUID>', singularName: '<String>', smartTags: '<JSON>', stepUp: '<JSON>', tags: '<String>', timestamps: '<Boolean>', useRls: '<Boolean>' });
```
