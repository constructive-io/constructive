# hooks-field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Field data operations

## Usage

```typescript
useFieldsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } } })
useFieldQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } } })
useCreateFieldMutation({ selection: { fields: { id: true } } })
useUpdateFieldMutation({ selection: { fields: { id: true } } })
useDeleteFieldMutation({})
```

## Examples

### List all fields

```typescript
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, defaultValue: true, defaultValueAst: true, isHidden: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});
```

### Create a field

```typescript
const { mutate } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', isRequired: '<value>', defaultValue: '<value>', defaultValueAst: '<value>', isHidden: '<value>', type: '<value>', fieldOrder: '<value>', regexp: '<value>', chk: '<value>', chkExpr: '<value>', min: '<value>', max: '<value>', tags: '<value>', category: '<value>', module: '<value>', scope: '<value>' });
```
