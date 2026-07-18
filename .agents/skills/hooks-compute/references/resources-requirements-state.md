# resourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesRequirementsState data operations

## Usage

```typescript
useResourcesRequirementsStatesQuery({ selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } } })
useCreateResourcesRequirementsStateMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all resourcesRequirementsStates

```typescript
const { data, isLoading } = useResourcesRequirementsStatesQuery({
  selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } },
});
```

### Create a resourcesRequirementsState

```typescript
const { mutate } = useCreateResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
mutate({ configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' });
```
