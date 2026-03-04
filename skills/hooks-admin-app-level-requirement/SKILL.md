---
name: hooks-admin-app-level-requirement
description: Defines the specific requirements that must be met to achieve a level
---

# hooks-admin-app-level-requirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the specific requirements that must be met to achieve a level

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
