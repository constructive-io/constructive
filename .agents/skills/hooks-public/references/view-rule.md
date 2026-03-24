# viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DO INSTEAD rules for views (e.g., read-only enforcement)

## Usage

```typescript
useViewRulesQuery({ selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } } })
useViewRuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, viewId: true, name: true, event: true, action: true } } })
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
mutate({ databaseId: '<UUID>', viewId: '<UUID>', name: '<String>', event: '<String>', action: '<String>' });
```
