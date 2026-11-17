# identityProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for IdentityProvider data operations

## Usage

```typescript
useIdentityProvidersQuery({ selection: { fields: { displayName: true, enabled: true, kind: true, slug: true } } })
```

## Examples

### List all identityProviders

```typescript
const { data, isLoading } = useIdentityProvidersQuery({
  selection: { fields: { displayName: true, enabled: true, kind: true, slug: true } },
});
```
