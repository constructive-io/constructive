# platformResourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesResolvedRequirement data operations

## Usage

```typescript
usePlatformResourcesResolvedRequirementsQuery({ selection: { fields: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } } })
useCreatePlatformResourcesResolvedRequirementMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourcesResolvedRequirements

```typescript
const { data, isLoading } = usePlatformResourcesResolvedRequirementsQuery({
  selection: { fields: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } },
});
```

### Create a platformResourcesResolvedRequirement

```typescript
const { mutate } = useCreatePlatformResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' });
```
