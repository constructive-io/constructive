# orgIsManagerOf

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgIsManagerOf query

## Usage

```typescript
db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pUserId: '<UUID>', pMaxDepth: '<Int>' }).execute()
```

## Examples

### Run orgIsManagerOf

```typescript
const result = await db.query.orgIsManagerOf({ pEntityId: '<UUID>', pManagerId: '<UUID>', pUserId: '<UUID>', pMaxDepth: '<Int>' }).execute();
```
