# importDefinitions

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the importDefinitions mutation

## Usage

```typescript
db.mutation.importDefinitions({ input: { graphId: '<UUID>', sourceScopeId: '<UUID>', sourceCommitId: '<UUID>', contexts: '<String>' } }).execute()
```

## Examples

### Run importDefinitions

```typescript
const result = await db.mutation.importDefinitions({ input: { graphId: '<UUID>', sourceScopeId: '<UUID>', sourceCommitId: '<UUID>', contexts: '<String>' } }).execute();
```
