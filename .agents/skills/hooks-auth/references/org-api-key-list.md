# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgApiKeyList data operations

## Usage

```typescript
useOrgApiKeyListsQuery({ selection: { fields: { accessLevel: true, createdAt: true, expiresAt: true, id: true, keyId: true, lastUsedAt: true, mfaLevel: true, name: true, orgId: true, principalId: true, revokedAt: true, updatedAt: true } } })
useOrgApiKeyListQuery({ id: '<UUID>', selection: { fields: { accessLevel: true, createdAt: true, expiresAt: true, id: true, keyId: true, lastUsedAt: true, mfaLevel: true, name: true, orgId: true, principalId: true, revokedAt: true, updatedAt: true } } })
useCreateOrgApiKeyListMutation({ selection: { fields: { id: true } } })
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

### Create a orgApiKeyList

```typescript
const { mutate } = useCreateOrgApiKeyListMutation({
  selection: { fields: { id: true } },
});
mutate({ accessLevel: '<String>', expiresAt: '<Datetime>', keyId: '<String>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', name: '<String>', orgId: '<UUID>', principalId: '<UUID>', revokedAt: '<Datetime>' });
```
