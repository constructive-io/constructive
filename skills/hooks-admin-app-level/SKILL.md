---
name: hooks-admin-app-level
description: Defines available levels that users can achieve by completing requirements
---

# hooks-admin-app-level

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines available levels that users can achieve by completing requirements

## Usage

```typescript
useAppLevelsQuery({ selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } } })
useAppLevelQuery({ id: '<value>', selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } } })
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
mutate({ name: '<value>', description: '<value>', image: '<value>', ownerId: '<value>' });
```
