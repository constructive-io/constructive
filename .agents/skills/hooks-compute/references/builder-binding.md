# builderBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed BuildKit resource for a lane (realm) — the reconciler projects its in-cluster Service address as BUILDKIT_HOST

## Usage

```typescript
useBuilderBindingsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, installationId: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useBuilderBindingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, installationId: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateBuilderBindingMutation({ selection: { fields: { id: true } } })
useUpdateBuilderBindingMutation({ selection: { fields: { id: true } } })
useDeleteBuilderBindingMutation({})
```

## Examples

### List all builderBindings

```typescript
const { data, isLoading } = useBuilderBindingsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, installationId: true, lastError: true, metadata: true, namespaceId: true, observedHost: true, realm: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a builderBinding

```typescript
const { mutate } = useCreateBuilderBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', installationId: '<UUID>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
