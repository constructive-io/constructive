# appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines the specific requirements that must be met to achieve a level

## Usage

```typescript
useAppLevelRequirementsQuery({ selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } } })
useAppLevelRequirementQuery({ id: '<value>', selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } } })
useCreateAppLevelRequirementMutation({ selection: { fields: { id: true } } })
useUpdateAppLevelRequirementMutation({ selection: { fields: { id: true } } })
useDeleteAppLevelRequirementMutation({})
```

## Examples

### List all appLevelRequirements

```typescript
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true, descriptionTrgmSimilarity: true, searchScore: true } },
});
```

### Create a appLevelRequirement

```typescript
const { mutate } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', level: '<value>', description: '<value>', requiredCount: '<value>', priority: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' });
```
