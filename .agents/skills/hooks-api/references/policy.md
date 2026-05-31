# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Policy data operations

## Usage

```typescript
usePoliciesQuery({ selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
usePolicyQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } } })
useCreatePolicyMutation({ selection: { fields: { id: true } } })
useUpdatePolicyMutation({ selection: { fields: { id: true } } })
useDeletePolicyMutation({})
```

## Examples

### List all policies

```typescript
const { data, isLoading } = usePoliciesQuery({
  selection: { fields: { id: true, databaseId: true, tableId: true, name: true, granteeName: true, privilege: true, permissive: true, disabled: true, policyType: true, data: true, smartTags: true, category: true, module: true, scope: true, tags: true, createdAt: true, updatedAt: true } },
});
```

### Create a policy

```typescript
const { mutate } = useCreatePolicyMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', granteeName: '<String>', privilege: '<String>', permissive: '<Boolean>', disabled: '<Boolean>', policyType: '<String>', data: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
