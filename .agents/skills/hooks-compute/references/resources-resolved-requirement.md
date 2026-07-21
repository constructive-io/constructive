# resourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesResolvedRequirement data operations

## Usage

```typescript
useResourcesResolvedRequirementsQuery({ selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } } })
useCreateResourcesResolvedRequirementMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all resourcesResolvedRequirements

```typescript
const { data, isLoading } = useResourcesResolvedRequirementsQuery({
  selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } },
});
```

### Create a resourcesResolvedRequirement

```typescript
const { mutate } = useCreateResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' });
```
