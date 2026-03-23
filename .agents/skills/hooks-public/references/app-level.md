# appLevel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available levels that users can achieve by completing requirements

## Usage

```typescript
useAppLevelsQuery({ selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } } })
useAppLevelQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } } })
useCreateAppLevelMutation({ selection: { fields: { id: true } } })
useUpdateAppLevelMutation({ selection: { fields: { id: true } } })
useDeleteAppLevelMutation({})
```

## Examples

### List all appLevels

```typescript
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});
```

### Create a appLevel

```typescript
const { mutate } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' });
```
