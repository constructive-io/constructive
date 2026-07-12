# platformResourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourcesRequirementsState data operations

## Usage

```typescript
usePlatformResourcesRequirementsStatesQuery({ selection: { fields: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } } })
useCreatePlatformResourcesRequirementsStateMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourcesRequirementsStates

```typescript
const { data, isLoading } = usePlatformResourcesRequirementsStatesQuery({
  selection: { fields: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } },
});
```

### Create a platformResourcesRequirementsState

```typescript
const { mutate } = useCreatePlatformResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', slug: '<String>', secretsHash: '<String>', configHash: '<String>', requirementsHash: '<String>', secretsObjectName: '<String>', configObjectName: '<String>' });
```
