# resourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourcesRequirementsState data operations

## Usage

```typescript
useResourcesRequirementsStatesQuery({ selection: { fields: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } } })
useCreateResourcesRequirementsStateMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all resourcesRequirementsStates

```typescript
const { data, isLoading } = useResourcesRequirementsStatesQuery({
  selection: { fields: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } },
});
```

### Create a resourcesRequirementsState

```typescript
const { mutate } = useCreateResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
mutate({ resourceId: '<UUID>', slug: '<String>', secretsHash: '<String>', configHash: '<String>', requirementsHash: '<String>', secretsObjectName: '<String>', configObjectName: '<String>' });
```
