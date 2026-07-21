# dbPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database provisioning preset catalog — merkle-versioned head over the infra store

## Usage

```typescript
useDbPresetsQuery({ selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } } })
useDbPresetQuery({ id: '<UUID>', selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } } })
useCreateDbPresetMutation({ selection: { fields: { id: true } } })
useUpdateDbPresetMutation({ selection: { fields: { id: true } } })
useDeleteDbPresetMutation({})
```

## Examples

### List all dbPresets

```typescript
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } },
});
```

### Create a dbPreset

```typescript
const { mutate } = useCreateDbPresetMutation({
  selection: { fields: { id: true } },
});
mutate({ active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' });
```
