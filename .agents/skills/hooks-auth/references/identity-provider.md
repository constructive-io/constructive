# identityProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for IdentityProvider data operations

## Usage

```typescript
useIdentityProvidersQuery({ selection: { fields: { displayName: true, enabled: true, kind: true, slug: true } } })
useCreateIdentityProviderMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all identityProviders

```typescript
const { data, isLoading } = useIdentityProvidersQuery({
  selection: { fields: { displayName: true, enabled: true, kind: true, slug: true } },
});
```

### Create a identityProvider

```typescript
const { mutate } = useCreateIdentityProviderMutation({
  selection: { fields: { id: true } },
});
mutate({ displayName: '<String>', enabled: '<Boolean>', kind: '<String>', slug: '<String>' });
```
