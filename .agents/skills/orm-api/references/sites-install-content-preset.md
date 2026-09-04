# sitesInstallContentPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the sitesInstallContentPreset mutation

## Usage

```typescript
db.mutation.sitesInstallContentPreset({ input: { entityId: '<UUID>', presetKind: '<String>', presetSlug: '<String>', siteId: '<UUID>' } }).execute()
```

## Examples

### Run sitesInstallContentPreset

```typescript
const result = await db.mutation.sitesInstallContentPreset({ input: { entityId: '<UUID>', presetKind: '<String>', presetSlug: '<String>', siteId: '<UUID>' } }).execute();
```
