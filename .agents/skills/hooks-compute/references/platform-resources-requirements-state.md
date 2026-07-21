# platformResourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesRequirementsState data operations

## Usage

```typescript
usePlatformResourcesRequirementsStatesQuery({ selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } } })
useCreatePlatformResourcesRequirementsStateMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourcesRequirementsStates

```typescript
const { data, isLoading } = usePlatformResourcesRequirementsStatesQuery({
  selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } },
});
```

### Create a platformResourcesRequirementsState

```typescript
const { mutate } = useCreatePlatformResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
mutate({ configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' });
```
