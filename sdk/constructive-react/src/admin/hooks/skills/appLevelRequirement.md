# hooks-appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppLevelRequirement data operations

## Usage

```typescript
useAppLevelRequirementsQuery({ selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } } })
useAppLevelRequirementQuery({ id: '<value>', selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } } })
useCreateAppLevelRequirementMutation({ selection: { fields: { id: true } } })
useUpdateAppLevelRequirementMutation({ selection: { fields: { id: true } } })
useDeleteAppLevelRequirementMutation({})
```

## Examples

### List all appLevelRequirements

```typescript
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});
```

### Create a appLevelRequirement

```typescript
const { mutate } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>' });
```
