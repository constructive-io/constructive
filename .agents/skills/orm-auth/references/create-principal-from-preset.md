# createPrincipalFromPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the createPrincipalFromPreset mutation

## Usage

```typescript
db.mutation.createPrincipalFromPreset({ input: { entityIds: '<UUID>', name: '<String>', overrides: '<JSON>', slug: '<String>' } }).execute()
```

## Examples

### Run createPrincipalFromPreset

```typescript
const result = await db.mutation.createPrincipalFromPreset({ input: { entityIds: '<UUID>', name: '<String>', overrides: '<JSON>', slug: '<String>' } }).execute();
```
