# platformServiceBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed platform service (BuildKit, hosted Git) for a lane (realm) — the reconciler projects its in-cluster Service address into the namespace config

## Usage

```typescript
usePlatformServiceBindingsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, installationId: true, installationScope: true, kind: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformServiceBindingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, installationId: true, installationScope: true, kind: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformServiceBindingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformServiceBindingMutation({ selection: { fields: { id: true } } })
useDeletePlatformServiceBindingMutation({})
```

## Examples

### List all platformServiceBindings

```typescript
const { data, isLoading } = usePlatformServiceBindingsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, installationId: true, installationScope: true, kind: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformServiceBinding

```typescript
const { mutate } = useCreatePlatformServiceBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', installationId: '<UUID>', installationScope: '<String>', kind: '<String>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
