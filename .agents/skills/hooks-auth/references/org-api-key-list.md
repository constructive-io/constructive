# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgApiKeyList data operations

## Usage

```typescript
useOrgApiKeyListsQuery({ selection: { fields: { accessLevel: true, createdAt: true, expiresAt: true, id: true, keyId: true, lastUsedAt: true, mfaLevel: true, name: true, orgId: true, principalId: true, revokedAt: true, updatedAt: true } } })
useOrgApiKeyListQuery({ id: '<UUID>', selection: { fields: { accessLevel: true, createdAt: true, expiresAt: true, id: true, keyId: true, lastUsedAt: true, mfaLevel: true, name: true, orgId: true, principalId: true, revokedAt: true, updatedAt: true } } })
useUpdateOrgApiKeyListMutation({ selection: { fields: { id: true } } })
useDeleteOrgApiKeyListMutation({})
```

## Examples

### List all orgApiKeyLists

```typescript
const { data, isLoading } = useOrgApiKeyListsQuery({
  selection: { fields: { accessLevel: true, createdAt: true, expiresAt: true, id: true, keyId: true, lastUsedAt: true, mfaLevel: true, name: true, orgId: true, principalId: true, revokedAt: true, updatedAt: true } },
});
```
