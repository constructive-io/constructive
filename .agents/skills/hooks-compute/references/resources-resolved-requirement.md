# resourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesResolvedRequirement data operations

## Usage

```typescript
useResourcesResolvedRequirementsQuery({ selection: { fields: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } } })
useCreateResourcesResolvedRequirementMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all resourcesResolvedRequirements

```typescript
const { data, isLoading } = useResourcesResolvedRequirementsQuery({
  selection: { fields: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } },
});
```

### Create a resourcesResolvedRequirement

```typescript
const { mutate } = useCreateResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' });
```
