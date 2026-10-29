# serviceBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed platform service (BuildKit, hosted Git) for a lane (realm) — the reconciler projects its in-cluster Service address into the namespace config

## Usage

```typescript
useServiceBindingsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, installationId: true, installationScope: true, kind: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useServiceBindingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, installationId: true, installationScope: true, kind: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateServiceBindingMutation({ selection: { fields: { id: true } } })
useUpdateServiceBindingMutation({ selection: { fields: { id: true } } })
useDeleteServiceBindingMutation({})
```

## Examples

### List all serviceBindings

```typescript
const { data, isLoading } = useServiceBindingsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, installationId: true, installationScope: true, kind: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a serviceBinding

```typescript
const { mutate } = useCreateServiceBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', installationId: '<UUID>', installationScope: '<String>', kind: '<String>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
