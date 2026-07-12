# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Table data operations

## Usage

```typescript
useTablesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, stepUp: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, createdAt: true, updatedAt: true, inheritsId: true } } })
useTableQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, stepUp: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, createdAt: true, updatedAt: true, inheritsId: true } } })
useCreateTableMutation({ selection: { fields: { id: true } } })
useUpdateTableMutation({ selection: { fields: { id: true } } })
useDeleteTableMutation({})
```

## Examples

### List all tables

```typescript
const { data, isLoading } = useTablesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, stepUp: true, partitioned: true, partitionStrategy: true, partitionKeyNames: true, partitionKeyTypes: true, createdAt: true, updatedAt: true, inheritsId: true } },
});
```

### Create a table

```typescript
const { mutate } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', stepUp: '<JSON>', partitioned: '<Boolean>', partitionStrategy: '<String>', partitionKeyNames: '<String>', partitionKeyTypes: '<String>', inheritsId: '<UUID>' });
```
