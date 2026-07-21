# orgSecretsDel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the orgSecretsDel mutation

## Usage

```typescript
db.mutation.orgSecretsDel({ input: { ownerId: '<UUID>', secretName: '<String>', namespaceId: '<UUID>' } }).execute()
```

## Examples

### Run orgSecretsDel

```typescript
const result = await db.mutation.orgSecretsDel({ input: { ownerId: '<UUID>', secretName: '<String>', namespaceId: '<UUID>' } }).execute();
```
