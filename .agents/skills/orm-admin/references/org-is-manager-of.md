# orgIsManagerOf

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgIsManagerOf query

## Usage

```typescript
db.query.orgIsManagerOf({ managerId: '<UUID>', maxDepth: '<Int>', targetEntityId: '<UUID>', userId: '<UUID>' }).execute()
```

## Examples

### Run orgIsManagerOf

```typescript
const result = await db.query.orgIsManagerOf({ managerId: '<UUID>', maxDepth: '<Int>', targetEntityId: '<UUID>', userId: '<UUID>' }).execute();
```
