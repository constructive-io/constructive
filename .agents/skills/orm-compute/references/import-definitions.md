# importDefinitions

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the importDefinitions mutation

## Usage

```typescript
db.mutation.importDefinitions({ input: { contexts: '<String>', graphId: '<UUID>', sourceCommitId: '<UUID>', sourceScopeId: '<UUID>' } }).execute()
```

## Examples

### Run importDefinitions

```typescript
const result = await db.mutation.importDefinitions({ input: { contexts: '<String>', graphId: '<UUID>', sourceCommitId: '<UUID>', sourceScopeId: '<UUID>' } }).execute();
```
