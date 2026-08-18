# platformK8sResourceKind

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Kubernetes kind allow-list for DB-driven resources — merkle-versioned head over the infra store; the admission gate fails closed on kinds without an active row

## Usage

```typescript
usePlatformK8sResourceKindsQuery({ selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, slug: true, storeId: true, updatedAt: true } } })
usePlatformK8sResourceKindQuery({ id: '<UUID>', selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, slug: true, storeId: true, updatedAt: true } } })
useCreatePlatformK8sResourceKindMutation({ selection: { fields: { id: true } } })
useUpdatePlatformK8sResourceKindMutation({ selection: { fields: { id: true } } })
useDeletePlatformK8sResourceKindMutation({})
```

## Examples

### List all platformK8sResourceKinds

```typescript
const { data, isLoading } = usePlatformK8sResourceKindsQuery({
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, slug: true, storeId: true, updatedAt: true } },
});
```

### Create a platformK8sResourceKind

```typescript
const { mutate } = useCreatePlatformK8sResourceKindMutation({
  selection: { fields: { id: true } },
});
mutate({ active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', slug: '<String>', storeId: '<UUID>' });
```
