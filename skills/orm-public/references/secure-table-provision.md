# secureTableProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via node_type, (2) grant privileges via grant_privileges, (3) create RLS policies via policy_type. Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent.

## Usage

```typescript
db.secureTableProvision.findMany({ select: { id: true } }).execute()
db.secureTableProvision.findOne({ id: '<value>', select: { id: true } }).execute()
db.secureTableProvision.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', nodeType: '<value>', useRls: '<value>', nodeData: '<value>', fields: '<value>', grantRoles: '<value>', grantPrivileges: '<value>', policyType: '<value>', policyPrivileges: '<value>', policyRole: '<value>', policyPermissive: '<value>', policyName: '<value>', policyData: '<value>', outFields: '<value>', tableNameTrgmSimilarity: '<value>', nodeTypeTrgmSimilarity: '<value>', policyTypeTrgmSimilarity: '<value>', policyRoleTrgmSimilarity: '<value>', policyNameTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.secureTableProvision.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.secureTableProvision.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all secureTableProvision records

```typescript
const items = await db.secureTableProvision.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a secureTableProvision

```typescript
const item = await db.secureTableProvision.create({
  data: { databaseId: 'value', schemaId: 'value', tableId: 'value', tableName: 'value', nodeType: 'value', useRls: 'value', nodeData: 'value', fields: 'value', grantRoles: 'value', grantPrivileges: 'value', policyType: 'value', policyPrivileges: 'value', policyRole: 'value', policyPermissive: 'value', policyName: 'value', policyData: 'value', outFields: 'value', tableNameTrgmSimilarity: 'value', nodeTypeTrgmSimilarity: 'value', policyTypeTrgmSimilarity: 'value', policyRoleTrgmSimilarity: 'value', policyNameTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
