# resourceInstallationsRollback

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the resourceInstallationsRollback mutation

## Usage

```typescript
db.mutation.resourceInstallationsRollback({ input: { pCommitId: '<UUID>', pInstallationId: '<UUID>' } }).execute()
```

## Examples

### Run resourceInstallationsRollback

```typescript
const result = await db.mutation.resourceInstallationsRollback({ input: { pCommitId: '<UUID>', pInstallationId: '<UUID>' } }).execute();
```
