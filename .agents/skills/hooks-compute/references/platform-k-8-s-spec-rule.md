# platformK8sSpecRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Spec rulebook for DB-driven resources — merkle-versioned head over the infra store; enforced by the generated admission gate via infra_utils.check_resource_admission

## Usage

```typescript
usePlatformK8sSpecRulesQuery({ selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, slug: true, storeId: true, updatedAt: true } } })
usePlatformK8sSpecRuleQuery({ id: '<UUID>', selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, slug: true, storeId: true, updatedAt: true } } })
useCreatePlatformK8sSpecRuleMutation({ selection: { fields: { id: true } } })
useUpdatePlatformK8sSpecRuleMutation({ selection: { fields: { id: true } } })
useDeletePlatformK8sSpecRuleMutation({})
```

## Examples

### List all platformK8sSpecRules

```typescript
const { data, isLoading } = usePlatformK8sSpecRulesQuery({
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, slug: true, storeId: true, updatedAt: true } },
});
```

### Create a platformK8sSpecRule

```typescript
const { mutate } = useCreatePlatformK8sSpecRuleMutation({
  selection: { fields: { id: true } },
});
mutate({ active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' });
```
