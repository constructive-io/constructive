# appCapabilitiesGetByMask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `AppCapability`.

## Usage

```typescript
db.query.appCapabilitiesGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute()
```

## Examples

### Run appCapabilitiesGetByMask

```typescript
const result = await db.query.appCapabilitiesGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute();
```
