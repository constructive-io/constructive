# registryBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed container registry for a lane (realm) — the reconciler projects that registry's credentials into the namespace as an image pull secret

## Usage

```typescript
useRegistryBindingsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, metadata: true, namespaceId: true, observedCredentialVersion: true, pullSecretName: true, realm: true, registryHost: true, registryId: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useRegistryBindingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, metadata: true, namespaceId: true, observedCredentialVersion: true, pullSecretName: true, realm: true, registryHost: true, registryId: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateRegistryBindingMutation({ selection: { fields: { id: true } } })
useUpdateRegistryBindingMutation({ selection: { fields: { id: true } } })
useDeleteRegistryBindingMutation({})
```

## Examples

### List all registryBindings

```typescript
const { data, isLoading } = useRegistryBindingsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, id: true, metadata: true, namespaceId: true, observedCredentialVersion: true, pullSecretName: true, realm: true, registryHost: true, registryId: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a registryBinding

```typescript
const { mutate } = useCreateRegistryBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', metadata: '<JSON>', namespaceId: '<UUID>', observedCredentialVersion: '<String>', pullSecretName: '<String>', realm: '<String>', registryHost: '<String>', registryId: '<UUID>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
