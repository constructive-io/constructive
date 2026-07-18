# platformResourceInstallationsRollback

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformResourceInstallationsRollback mutation

## Usage

```typescript
db.mutation.platformResourceInstallationsRollback({ input: { pCommitId: '<UUID>', pInstallationId: '<UUID>' } }).execute()
```

## Examples

### Run platformResourceInstallationsRollback

```typescript
const result = await db.mutation.platformResourceInstallationsRollback({ input: { pCommitId: '<UUID>', pInstallationId: '<UUID>' } }).execute();
```
