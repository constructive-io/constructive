# appsUpgradeApp

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the appsUpgradeApp mutation

## Usage

```typescript
db.mutation.appsUpgradeApp({ input: { newParams: '<JSON>', targetAppId: '<UUID>' } }).execute()
```

## Examples

### Run appsUpgradeApp

```typescript
const result = await db.mutation.appsUpgradeApp({ input: { newParams: '<JSON>', targetAppId: '<UUID>' } }).execute();
```
