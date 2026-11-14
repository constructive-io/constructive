# resourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesRequirementsState data operations

## Usage

```typescript
useResourcesRequirementsStatesQuery({ selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } } })
```

## Examples

### List all resourcesRequirementsStates

```typescript
const { data, isLoading } = useResourcesRequirementsStatesQuery({
  selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } },
});
```
