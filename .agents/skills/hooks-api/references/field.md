# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Field data operations

## Usage

```typescript
useFieldsQuery({ selection: { fields: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useFieldQuery({ id: '<UUID>', selection: { fields: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } } })
useCreateFieldMutation({ selection: { fields: { id: true } } })
useUpdateFieldMutation({ selection: { fields: { id: true } } })
useDeleteFieldMutation({})
```

## Examples

### List all fields

```typescript
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { apiRequired: true, category: true, chk: true, chkExpr: true, createdAt: true, databaseId: true, defaultValue: true, description: true, fieldOrder: true, generationExpression: true, generationType: true, id: true, isRequired: true, label: true, max: true, min: true, name: true, regexp: true, smartTags: true, tableId: true, tags: true, type: true, updatedAt: true } },
});
```

### Create a field

```typescript
const { mutate } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ apiRequired: '<Boolean>', category: '<ObjectCategory>', chk: '<JSON>', chkExpr: '<JSON>', databaseId: '<UUID>', defaultValue: '<JSON>', description: '<String>', fieldOrder: '<Int>', generationExpression: '<JSON>', generationType: '<String>', isRequired: '<Boolean>', label: '<String>', max: '<Float>', min: '<Float>', name: '<String>', regexp: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<JSON>' });
```
