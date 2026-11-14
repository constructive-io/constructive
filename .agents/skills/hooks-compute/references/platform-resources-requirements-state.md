# platformResourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesRequirementsState data operations

## Usage

```typescript
usePlatformResourcesRequirementsStatesQuery({ selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } } })
```

## Examples

### List all platformResourcesRequirementsStates

```typescript
const { data, isLoading } = usePlatformResourcesRequirementsStatesQuery({
  selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } },
});
```
