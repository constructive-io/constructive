# createApiKey

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the createApiKey mutation

## Usage

```typescript
db.mutation.createApiKey({ input: { accessLevel: '<String>', expiresIn: '<IntervalInput>', keyName: '<String>', mfaLevel: '<String>', principalId: '<UUID>' } }).execute()
```

## Examples

### Run createApiKey

```typescript
const result = await db.mutation.createApiKey({ input: { accessLevel: '<String>', expiresIn: '<IntervalInput>', keyName: '<String>', mfaLevel: '<String>', principalId: '<UUID>' } }).execute();
```
