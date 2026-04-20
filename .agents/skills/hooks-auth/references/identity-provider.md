# identityProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for IdentityProvider data operations

## Usage

```typescript
useIdentityProvidersQuery({ selection: { fields: { slug: true, kind: true, displayName: true, enabled: true, isBuiltIn: true } } })
useCreateIdentityProviderMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all identityProviders

```typescript
const { data, isLoading } = useIdentityProvidersQuery({
  selection: { fields: { slug: true, kind: true, displayName: true, enabled: true, isBuiltIn: true } },
});
```

### Create a identityProvider

```typescript
const { mutate } = useCreateIdentityProviderMutation({
  selection: { fields: { id: true } },
});
mutate({ slug: '<String>', kind: '<String>', displayName: '<String>', enabled: '<Boolean>', isBuiltIn: '<Boolean>' });
```
