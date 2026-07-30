# domainType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DomainType data operations

## Usage

```typescript
useDomainTypesQuery({ selection: { fields: { baseType: true, category: true, checkExpr: true, databaseId: true, defaultExpr: true, description: true, id: true, label: true, name: true, notNull: true, schemaId: true, smartTags: true, tags: true } } })
useDomainTypeQuery({ id: '<UUID>', selection: { fields: { baseType: true, category: true, checkExpr: true, databaseId: true, defaultExpr: true, description: true, id: true, label: true, name: true, notNull: true, schemaId: true, smartTags: true, tags: true } } })
useCreateDomainTypeMutation({ selection: { fields: { id: true } } })
useUpdateDomainTypeMutation({ selection: { fields: { id: true } } })
useDeleteDomainTypeMutation({})
```

## Examples

### List all domainTypes

```typescript
const { data, isLoading } = useDomainTypesQuery({
  selection: { fields: { baseType: true, category: true, checkExpr: true, databaseId: true, defaultExpr: true, description: true, id: true, label: true, name: true, notNull: true, schemaId: true, smartTags: true, tags: true } },
});
```

### Create a domainType

```typescript
const { mutate } = useCreateDomainTypeMutation({
  selection: { fields: { id: true } },
});
mutate({ baseType: '<JSON>', category: '<ObjectCategory>', checkExpr: '<JSON>', databaseId: '<UUID>', defaultExpr: '<JSON>', description: '<String>', label: '<String>', name: '<String>', notNull: '<Boolean>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' });
```
