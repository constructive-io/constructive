# platformBuilderBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed BuildKit resource for a lane (realm) — the reconciler projects its in-cluster Service address as BUILDKIT_HOST

## Usage

```typescript
usePlatformBuilderBindingsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, installationId: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformBuilderBindingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, installationId: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformBuilderBindingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformBuilderBindingMutation({ selection: { fields: { id: true } } })
useDeletePlatformBuilderBindingMutation({})
```

## Examples

### List all platformBuilderBindings

```typescript
const { data, isLoading } = usePlatformBuilderBindingsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, installationId: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformBuilderBinding

```typescript
const { mutate } = useCreatePlatformBuilderBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', installationId: '<UUID>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
