# platformRegistryBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed container registry for a lane (realm) — the reconciler projects that registry's credentials into the namespace as an image pull secret

## Usage

```typescript
usePlatformRegistryBindingsQuery({ selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, metadata: true, namespaceId: true, observedCredentialVersion: true, pullSecretName: true, realm: true, registryHost: true, registryId: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformRegistryBindingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, metadata: true, namespaceId: true, observedCredentialVersion: true, pullSecretName: true, realm: true, registryHost: true, registryId: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformRegistryBindingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRegistryBindingMutation({ selection: { fields: { id: true } } })
useDeletePlatformRegistryBindingMutation({})
```

## Examples

### List all platformRegistryBindings

```typescript
const { data, isLoading } = usePlatformRegistryBindingsQuery({
  selection: { fields: { createdAt: true, createdBy: true, createdByPrincipal: true, id: true, metadata: true, namespaceId: true, observedCredentialVersion: true, pullSecretName: true, realm: true, registryHost: true, registryId: true, status: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformRegistryBinding

```typescript
const { mutate } = useCreatePlatformRegistryBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', createdByPrincipal: '<UUID>', metadata: '<JSON>', namespaceId: '<UUID>', observedCredentialVersion: '<String>', pullSecretName: '<String>', realm: '<String>', registryHost: '<String>', registryId: '<UUID>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
