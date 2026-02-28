# hooks-appStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for AppStep data operations

## Usage

```typescript
useAppStepsQuery({ selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } } })
useAppStepQuery({ id: '<value>', selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } } })
useCreateAppStepMutation({ selection: { fields: { id: true } } })
useUpdateAppStepMutation({ selection: { fields: { id: true } } })
useDeleteAppStepMutation({})
```

## Examples

### List all appSteps

```typescript
const { data, isLoading } = useAppStepsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});
```

### Create a appStep

```typescript
const { mutate } = useCreateAppStepMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<value>', name: '<value>', count: '<value>' });
```
