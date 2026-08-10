# appsUninstallApp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the appsUninstallApp mutation

## Usage

```typescript
db.mutation.appsUninstallApp({ input: { targetAppId: '<UUID>' } }).execute()
```

## Examples

### Run appsUninstallApp

```typescript
const result = await db.mutation.appsUninstallApp({ input: { targetAppId: '<UUID>' } }).execute();
```
