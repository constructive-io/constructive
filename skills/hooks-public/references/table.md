# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Table data operations

## Usage

```typescript
useTablesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, pluralNameTrgmSimilarity: true, singularNameTrgmSimilarity: true, searchScore: true } } })
useTableQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, pluralNameTrgmSimilarity: true, singularNameTrgmSimilarity: true, searchScore: true } } })
useCreateTableMutation({ selection: { fields: { id: true } } })
useUpdateTableMutation({ selection: { fields: { id: true } } })
useDeleteTableMutation({})
```

## Examples

### List all tables

```typescript
const { data, isLoading } = useTablesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, smartTags: true, category: true, module: true, scope: true, useRls: true, timestamps: true, peoplestamps: true, pluralName: true, singularName: true, tags: true, inheritsId: true, createdAt: true, updatedAt: true, nameTrgmSimilarity: true, labelTrgmSimilarity: true, descriptionTrgmSimilarity: true, moduleTrgmSimilarity: true, pluralNameTrgmSimilarity: true, singularNameTrgmSimilarity: true, searchScore: true } },
});
```

### Create a table

```typescript
const { mutate } = useCreateTableMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', useRls: '<value>', timestamps: '<value>', peoplestamps: '<value>', pluralName: '<value>', singularName: '<value>', tags: '<value>', inheritsId: '<value>', nameTrgmSimilarity: '<value>', labelTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', pluralNameTrgmSimilarity: '<value>', singularNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```
