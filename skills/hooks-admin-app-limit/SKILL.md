---
name: hooks-admin-app-limit
description: Tracks per-actor usage counts against configurable maximum limits
---

# hooks-admin-app-limit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
useAppLimitsQuery({ selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } } })
useAppLimitQuery({ id: '<value>', selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } } })
useCreateAppLimitMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitMutation({})
```

## Examples

### List all appLimits

```typescript
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true } },
});
```

### Create a appLimit

```typescript
const { mutate } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>' });
```
