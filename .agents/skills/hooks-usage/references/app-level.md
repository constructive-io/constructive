# appLevel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available levels that users can achieve by completing requirements

## Usage

```typescript
useAppLevelsQuery({ selection: { fields: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } } })
useAppLevelQuery({ id: '<UUID>', selection: { fields: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } } })
useCreateAppLevelMutation({ selection: { fields: { id: true } } })
useUpdateAppLevelMutation({ selection: { fields: { id: true } } })
useDeleteAppLevelMutation({})
```

## Examples

### List all appLevels

```typescript
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } },
});
```

### Create a appLevel

```typescript
const { mutate } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
mutate({ description: '<String>', image: '<Image>', name: '<String>', ownerId: '<UUID>' });
```
