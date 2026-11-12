# orgGetManagersRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgGetManagersRecord data operations

## Usage

```typescript
useOrgGetManagersQuery({ selection: { fields: { depth: true, userId: true } } })
```

## Examples

### List all orgGetManagers

```typescript
const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { depth: true, userId: true } },
});
```
