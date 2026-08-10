# appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the specific requirements that must be met to achieve a level

## Usage

```typescript
useAppLevelRequirementsQuery({ selection: { fields: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } } })
useAppLevelRequirementQuery({ id: '<UUID>', selection: { fields: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } } })
useCreateAppLevelRequirementMutation({ selection: { fields: { id: true } } })
useUpdateAppLevelRequirementMutation({ selection: { fields: { id: true } } })
useDeleteAppLevelRequirementMutation({})
```

## Examples

### List all appLevelRequirements

```typescript
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } },
});
```

### Create a appLevelRequirement

```typescript
const { mutate } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ description: '<String>', groupKey: '<String>', level: '<String>', metric: '<String>', name: '<String>', priority: '<Int>', requiredCount: '<Int>' });
```
