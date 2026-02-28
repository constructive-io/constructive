# hooks-viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ViewRule data operations

## Usage

```typescript
useViewRulesQuery({ selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } } })
useViewRuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } } })
useCreateViewRuleMutation({ selection: { fields: { id: true } } })
useUpdateViewRuleMutation({ selection: { fields: { id: true } } })
useDeleteViewRuleMutation({})
```

## Examples

### List all viewRules

```typescript
const { data, isLoading } = useViewRulesQuery({
  selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } },
});
```

### Create a viewRule

```typescript
const { mutate } = useCreateViewRuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', viewId: '<value>', name: '<value>', event: '<value>', action: '<value>' });
```
