# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgApiKeyList data operations

## Usage

```typescript
useOrgApiKeyListsQuery({ selection: { fields: { id: true, keyId: true, name: true, principalId: true, orgId: true, expiresAt: true, revokedAt: true, lastUsedAt: true, mfaLevel: true, accessLevel: true, createdAt: true, updatedAt: true } } })
useOrgApiKeyListQuery({ id: '<UUID>', selection: { fields: { id: true, keyId: true, name: true, principalId: true, orgId: true, expiresAt: true, revokedAt: true, lastUsedAt: true, mfaLevel: true, accessLevel: true, createdAt: true, updatedAt: true } } })
useCreateOrgApiKeyListMutation({ selection: { fields: { id: true } } })
useUpdateOrgApiKeyListMutation({ selection: { fields: { id: true } } })
useDeleteOrgApiKeyListMutation({})
```

## Examples

### List all orgApiKeyLists

```typescript
const { data, isLoading } = useOrgApiKeyListsQuery({
  selection: { fields: { id: true, keyId: true, name: true, principalId: true, orgId: true, expiresAt: true, revokedAt: true, lastUsedAt: true, mfaLevel: true, accessLevel: true, createdAt: true, updatedAt: true } },
});
```

### Create a orgApiKeyList

```typescript
const { mutate } = useCreateOrgApiKeyListMutation({
  selection: { fields: { id: true } },
});
mutate({ keyId: '<String>', name: '<String>', principalId: '<UUID>', orgId: '<UUID>', expiresAt: '<Datetime>', revokedAt: '<Datetime>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', accessLevel: '<String>' });
```
