# orgSecretsRemoveArray

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgSecretsRemoveArray mutation

## Usage

```typescript
db.mutation.orgSecretsRemoveArray({ input: { ownerId: '<UUID>', secretNames: '<String>', namespaceId: '<UUID>' } }).execute()
```

## Examples

### Run orgSecretsRemoveArray

```typescript
const result = await db.mutation.orgSecretsRemoveArray({ input: { ownerId: '<UUID>', secretNames: '<String>', namespaceId: '<UUID>' } }).execute();
```
