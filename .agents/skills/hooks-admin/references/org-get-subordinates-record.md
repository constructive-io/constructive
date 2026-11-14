# orgGetSubordinatesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgGetSubordinatesRecord data operations

## Usage

```typescript
useOrgGetSubordinatesQuery({ selection: { fields: { depth: true, userId: true } } })
```

## Examples

### List all orgGetSubordinates

```typescript
const { data, isLoading } = useOrgGetSubordinatesQuery({
  selection: { fields: { depth: true, userId: true } },
});
```
