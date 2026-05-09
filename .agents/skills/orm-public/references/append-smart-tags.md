# appendSmartTags

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the appendSmartTags mutation

## Usage

```typescript
db.mutation.appendSmartTags({ input: { pTableId: '<UUID>', pTags: '<JSON>' } }).execute()
```

## Examples

### Run appendSmartTags

```typescript
const result = await db.mutation.appendSmartTags({ input: { pTableId: '<UUID>', pTags: '<JSON>' } }).execute();
```
