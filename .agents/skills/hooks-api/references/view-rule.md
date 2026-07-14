# viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DO INSTEAD rules for views (e.g., read-only enforcement)

## Usage

```typescript
useViewRulesQuery({ selection: { fields: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } } })
useViewRuleQuery({ id: '<UUID>', selection: { fields: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } } })
useCreateViewRuleMutation({ selection: { fields: { id: true } } })
useUpdateViewRuleMutation({ selection: { fields: { id: true } } })
useDeleteViewRuleMutation({})
```

## Examples

### List all viewRules

```typescript
const { data, isLoading } = useViewRulesQuery({
  selection: { fields: { action: true, databaseId: true, event: true, id: true, name: true, viewId: true } },
});
```

### Create a viewRule

```typescript
const { mutate } = useCreateViewRuleMutation({
  selection: { fields: { id: true } },
});
mutate({ action: '<String>', databaseId: '<UUID>', event: '<String>', name: '<String>', viewId: '<UUID>' });
```
