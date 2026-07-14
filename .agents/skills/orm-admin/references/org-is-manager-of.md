# orgIsManagerOf

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgIsManagerOf query

## Usage

```typescript
db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pMaxDepth: '<Int>', pUserId: '<UUID>' }).execute()
```

## Examples

### Run orgIsManagerOf

```typescript
const result = await db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pMaxDepth: '<Int>', pUserId: '<UUID>' }).execute();
```
