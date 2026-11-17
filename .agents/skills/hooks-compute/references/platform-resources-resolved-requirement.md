# platformResourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesResolvedRequirement data operations

## Usage

```typescript
usePlatformResourcesResolvedRequirementsQuery({ selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, realm: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } } })
```

## Examples

### List all platformResourcesResolvedRequirements

```typescript
const { data, isLoading } = usePlatformResourcesResolvedRequirementsQuery({
  selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, realm: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } },
});
```
