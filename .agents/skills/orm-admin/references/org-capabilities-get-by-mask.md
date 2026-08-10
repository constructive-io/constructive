# orgCapabilitiesGetByMask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Reads and enables pagination through a set of `OrgCapability`.

## Usage

```typescript
db.query.orgCapabilitiesGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute()
```

## Examples

### Run orgCapabilitiesGetByMask

```typescript
const result = await db.query.orgCapabilitiesGetByMask({ after: '<Cursor>', first: '<Int>', mask: '<BitString>', offset: '<Int>' }).execute();
```
