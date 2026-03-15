# policy

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Policy records

## Usage

```typescript
db.policy.findMany({ select: { id: true } }).execute()
db.policy.findOne({ id: '<value>', select: { id: true } }).execute()
db.policy.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', granteeName: '<value>', privilege: '<value>', permissive: '<value>', disabled: '<value>', policyType: '<value>', data: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>', nameTrgmSimilarity: '<value>', granteeNameTrgmSimilarity: '<value>', privilegeTrgmSimilarity: '<value>', policyTypeTrgmSimilarity: '<value>', moduleTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.policy.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.policy.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all policy records

```typescript
const items = await db.policy.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a policy

```typescript
const item = await db.policy.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', granteeName: 'value', privilege: 'value', permissive: 'value', disabled: 'value', policyType: 'value', data: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value', nameTrgmSimilarity: 'value', granteeNameTrgmSimilarity: 'value', privilegeTrgmSimilarity: 'value', policyTypeTrgmSimilarity: 'value', moduleTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
