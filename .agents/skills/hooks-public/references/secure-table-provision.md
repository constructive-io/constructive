# secureTableProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent.

## Usage

```typescript
useSecureTableProvisionsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } } })
useSecureTableProvisionQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } } })
useCreateSecureTableProvisionMutation({ selection: { fields: { id: true } } })
useUpdateSecureTableProvisionMutation({ selection: { fields: { id: true } } })
useDeleteSecureTableProvisionMutation({})
```

## Examples

### List all secureTableProvisions

```typescript
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, fields: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } },
});
```

### Create a secureTableProvision

```typescript
const { mutate } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', nodeType: '<String>', useRls: '<Boolean>', nodeData: '<JSON>', fields: '<JSON>', grantRoles: '<String>', grantPrivileges: '<JSON>', policyType: '<String>', policyPrivileges: '<String>', policyRole: '<String>', policyPermissive: '<Boolean>', policyName: '<String>', policyData: '<JSON>', outFields: '<UUID>' });
```
