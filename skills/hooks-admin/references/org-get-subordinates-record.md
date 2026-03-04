# orgGetSubordinatesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for OrgGetSubordinatesRecord data operations

## Usage

```typescript
useOrgGetSubordinatesQuery({ selection: { fields: { userId: true, depth: true } } })
useCreateOrgGetSubordinatesRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all orgGetSubordinates

```typescript
const { data, isLoading } = useOrgGetSubordinatesQuery({
  selection: { fields: { userId: true, depth: true } },
});
```

### Create a orgGetSubordinatesRecord

```typescript
const { mutate } = useCreateOrgGetSubordinatesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ userId: '<value>', depth: '<value>' });
```
