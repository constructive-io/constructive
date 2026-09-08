# identityProviderRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for IdentityProviderRegistry data operations

## Usage

```typescript
useIdentityProviderRegistriesQuery({ selection: { fields: { authorizationUrl: true, displayName: true, issuerUrl: true, kind: true, scopes: true, slug: true, tokenUrl: true, userinfoUrl: true } } })
useIdentityProviderRegistryQuery({ slug: '<String>', selection: { fields: { authorizationUrl: true, displayName: true, issuerUrl: true, kind: true, scopes: true, slug: true, tokenUrl: true, userinfoUrl: true } } })
useCreateIdentityProviderRegistryMutation({ selection: { fields: { slug: true } } })
useUpdateIdentityProviderRegistryMutation({ selection: { fields: { slug: true } } })
useDeleteIdentityProviderRegistryMutation({})
```

## Examples

### List all identityProviderRegistries

```typescript
const { data, isLoading } = useIdentityProviderRegistriesQuery({
  selection: { fields: { authorizationUrl: true, displayName: true, issuerUrl: true, kind: true, scopes: true, slug: true, tokenUrl: true, userinfoUrl: true } },
});
```

### Create a identityProviderRegistry

```typescript
const { mutate } = useCreateIdentityProviderRegistryMutation({
  selection: { fields: { slug: true } },
});
mutate({ authorizationUrl: '<String>', displayName: '<String>', issuerUrl: '<String>', kind: '<String>', scopes: '<String>', tokenUrl: '<String>', userinfoUrl: '<String>' });
```
