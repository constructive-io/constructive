# dbPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database provisioning preset catalog — merkle-versioned head over the infra store

## Usage

```typescript
useDbPresetsQuery({ selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } } })
useDbPresetQuery({ id: '<UUID>', selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } } })
useCreateDbPresetMutation({ selection: { fields: { id: true } } })
useUpdateDbPresetMutation({ selection: { fields: { id: true } } })
useDeleteDbPresetMutation({})
```

## Examples

### List all dbPresets

```typescript
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } },
});
```

### Create a dbPreset

```typescript
const { mutate } = useCreateDbPresetMutation({
  selection: { fields: { id: true } },
});
mutate({ storeId: '<UUID>', slug: '<String>', definition: '<JSON>', commitId: '<UUID>', modulesHash: '<UUID>', label: '<String>', description: '<String>', active: '<Boolean>' });
```
