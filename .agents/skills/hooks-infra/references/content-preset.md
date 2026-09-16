# contentPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Seed-content preset catalog (limit defaults, trust ladders, ...) — merkle-versioned head over the infra store

## Usage

```typescript
useContentPresetsQuery({ selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, kind: true, label: true, slug: true, storeId: true, updatedAt: true } } })
useContentPresetQuery({ id: '<UUID>', selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, kind: true, label: true, slug: true, storeId: true, updatedAt: true } } })
useCreateContentPresetMutation({ selection: { fields: { id: true } } })
useUpdateContentPresetMutation({ selection: { fields: { id: true } } })
useDeleteContentPresetMutation({})
```

## Examples

### List all contentPresets

```typescript
const { data, isLoading } = useContentPresetsQuery({
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, kind: true, label: true, slug: true, storeId: true, updatedAt: true } },
});
```

### Create a contentPreset

```typescript
const { mutate } = useCreateContentPresetMutation({
  selection: { fields: { id: true } },
});
mutate({ active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', kind: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' });
```
