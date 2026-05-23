# revParse

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the revParse query

## Usage

```typescript
db.query.revParse({ sId: '<UUID>', storeId: '<UUID>', refname: '<String>' }).execute()
```

## Examples

### Run revParse

```typescript
const result = await db.query.revParse({ sId: '<UUID>', storeId: '<UUID>', refname: '<String>' }).execute();
```
