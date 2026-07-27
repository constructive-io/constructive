# hostnameBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Compiled hostname index maintained by domain sync triggers; read only through the resolver

## Usage

```typescript
useHostnameBindingsQuery({ selection: { fields: { domainId: true, hostname: true, id: true, isWildcard: true, managed: true, parentHostname: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, verificationStatus: true } } })
useHostnameBindingQuery({ id: '<UUID>', selection: { fields: { domainId: true, hostname: true, id: true, isWildcard: true, managed: true, parentHostname: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, verificationStatus: true } } })
useCreateHostnameBindingMutation({ selection: { fields: { id: true } } })
useUpdateHostnameBindingMutation({ selection: { fields: { id: true } } })
useDeleteHostnameBindingMutation({})
```

## Examples

### List all hostnameBindings

```typescript
const { data, isLoading } = useHostnameBindingsQuery({
  selection: { fields: { domainId: true, hostname: true, id: true, isWildcard: true, managed: true, parentHostname: true, tlsSecretName: true, tlsStatus: true, updatedAt: true, verificationStatus: true } },
});
```

### Create a hostnameBinding

```typescript
const { mutate } = useCreateHostnameBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ domainId: '<UUID>', hostname: '<String>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsSecretName: '<String>', tlsStatus: '<String>', verificationStatus: '<String>' });
```
