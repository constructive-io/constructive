# provisionOrgUsersBulk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the provisionOrgUsersBulk mutation

## Usage

```typescript
db.mutation.provisionOrgUsersBulk({ input: { entityId: '<UUID>', users: '<JSON>' } }).execute()
```

## Examples

### Run provisionOrgUsersBulk

```typescript
const result = await db.mutation.provisionOrgUsersBulk({ input: { entityId: '<UUID>', users: '<JSON>' } }).execute();
```
