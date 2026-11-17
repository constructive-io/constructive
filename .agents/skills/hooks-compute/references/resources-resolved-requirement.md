# resourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesResolvedRequirement data operations

## Usage

```typescript
useResourcesResolvedRequirementsQuery({ selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, realm: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } } })
```

## Examples

### List all resourcesResolvedRequirements

```typescript
const { data, isLoading } = useResourcesResolvedRequirementsQuery({
  selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, realm: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } },
});
```
