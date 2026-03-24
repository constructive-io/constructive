# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Table data operations

## Usage

```typescript
useTablesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } } })
useTableQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } } })
useCreateTableMutation({ selection: { fields: { id: true } } })
useUpdateTableMutation({ selection: { fields: { id: true } } })
useDeleteTableMutation({})
```

## Examples

### List all tables

```typescript
const { data, isLoading } = useTablesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true } },
});
```

### Create a table

```typescript
const { mutate } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', useRls: '<Boolean>', timestamps: '<Boolean>', peoplestamps: '<Boolean>', pluralName: '<String>', singularName: '<String>', tags: '<String>', inheritsId: '<UUID>' });
```
