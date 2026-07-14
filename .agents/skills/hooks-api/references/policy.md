# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Policy data operations

## Usage

```typescript
usePoliciesQuery({ selection: { fields: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } } })
usePolicyQuery({ id: '<UUID>', selection: { fields: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } } })
useCreatePolicyMutation({ selection: { fields: { id: true } } })
useUpdatePolicyMutation({ selection: { fields: { id: true } } })
useDeletePolicyMutation({})
```

## Examples

### List all policies

```typescript
const { data, isLoading } = usePoliciesQuery({
  selection: { fields: { category: true, createdAt: true, data: true, databaseId: true, disabled: true, granteeName: true, id: true, name: true, permissive: true, policyType: true, privilege: true, smartTags: true, tableId: true, tags: true, updatedAt: true, withCheck: true } },
});
```

### Create a policy

```typescript
const { mutate } = useCreatePolicyMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', disabled: '<Boolean>', granteeName: '<String>', name: '<String>', permissive: '<Boolean>', policyType: '<String>', privilege: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', withCheck: '<JSON>' });
```
