# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Field data operations

## Usage

```typescript
useFieldsQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } } })
useFieldQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } } })
useCreateFieldMutation({ selection: { fields: { id: true } } })
useUpdateFieldMutation({ selection: { fields: { id: true } } })
useDeleteFieldMutation({})
```

## Examples

### List all fields

```typescript
const { data, isLoading } = useFieldsQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, label: true, description: true, smartTags: true, isRequired: true, apiRequired: true, defaultValue: true, defaultValueAst: true, type: true, fieldOrder: true, regexp: true, chk: true, chkExpr: true, min: true, max: true, tags: true, category: true, module: true, scope: true, createdAt: true, updatedAt: true } },
});
```

### Create a field

```typescript
const { mutate } = useCreateFieldMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<String>', defaultValueAst: '<JSON>', type: '<String>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' });
```
