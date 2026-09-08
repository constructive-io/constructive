# mintAccessToken

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the mintAccessToken mutation

## Usage

```typescript
db.mutation.mintAccessToken({ input: { accessTtl: '<IntervalInput>', intent: '<String>', principalId: '<UUID>' } }).execute()
```

## Examples

### Run mintAccessToken

```typescript
const result = await db.mutation.mintAccessToken({ input: { accessTtl: '<IntervalInput>', intent: '<String>', principalId: '<UUID>' } }).execute();
```
