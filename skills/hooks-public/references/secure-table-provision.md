# secureTableProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent.

## Usage

```typescript
useSecureTableProvisionsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } } })
useSecureTableProvisionQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } } })
useCreateSecureTableProvisionMutation({ selection: { fields: { id: true } } })
useUpdateSecureTableProvisionMutation({ selection: { fields: { id: true } } })
useDeleteSecureTableProvisionMutation({})
```

## Examples

### List all secureTableProvisions

```typescript
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, tableId: true, tableName: true, nodeType: true, useRls: true, nodeData: true, grantRoles: true, grantPrivileges: true, policyType: true, policyPrivileges: true, policyRole: true, policyPermissive: true, policyName: true, policyData: true, outFields: true } },
});
```

### Create a secureTableProvision

```typescript
const { mutate } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', nodeType: '<value>', useRls: '<value>', nodeData: '<value>', grantRoles: '<value>', grantPrivileges: '<value>', policyType: '<value>', policyPrivileges: '<value>', policyRole: '<value>', policyPermissive: '<value>', policyName: '<value>', policyData: '<value>', outFields: '<value>' });
```
