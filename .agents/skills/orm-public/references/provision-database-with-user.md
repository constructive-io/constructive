# provisionDatabaseWithUser

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the provisionDatabaseWithUser mutation

## Usage

```typescript
db.mutation.provisionDatabaseWithUser({ input: { pDatabaseName: '<String>', pDomain: '<String>', pSubdomain: '<String>', pModules: '<String>', pOptions: '<JSON>' } }).execute()
```

## Examples

### Run provisionDatabaseWithUser

```typescript
const result = await db.mutation.provisionDatabaseWithUser({ input: { pDatabaseName: '<String>', pDomain: '<String>', pSubdomain: '<String>', pModules: '<String>', pOptions: '<JSON>' } }).execute();
```
