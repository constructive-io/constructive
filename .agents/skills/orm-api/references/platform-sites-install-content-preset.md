# platformSitesInstallContentPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the platformSitesInstallContentPreset mutation

## Usage

```typescript
db.mutation.platformSitesInstallContentPreset({ input: { entityId: '<UUID>', presetKind: '<String>', presetSlug: '<String>', siteId: '<UUID>' } }).execute()
```

## Examples

### Run platformSitesInstallContentPreset

```typescript
const result = await db.mutation.platformSitesInstallContentPreset({ input: { entityId: '<UUID>', presetKind: '<String>', presetSlug: '<String>', siteId: '<UUID>' } }).execute();
```
