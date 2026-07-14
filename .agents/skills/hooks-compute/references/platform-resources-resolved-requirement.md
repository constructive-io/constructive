# platformResourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesResolvedRequirement data operations

## Usage

```typescript
usePlatformResourcesResolvedRequirementsQuery({ selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } } })
useCreatePlatformResourcesResolvedRequirementMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourcesResolvedRequirements

```typescript
const { data, isLoading } = usePlatformResourcesResolvedRequirementsQuery({
  selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } },
});
```

### Create a platformResourcesResolvedRequirement

```typescript
const { mutate } = useCreatePlatformResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' });
```
