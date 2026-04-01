# blueprintConstruction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks individual construction attempts of a blueprint. Each time construct_blueprint() is called, a new record is created here. This separates the editable blueprint definition from its build history, allowing blueprints to be re-executed, constructed into multiple databases, and maintain an audit trail of all construction attempts.

## Usage

```typescript
useBlueprintConstructionsQuery({ selection: { fields: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } } })
useBlueprintConstructionQuery({ id: '<UUID>', selection: { fields: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } } })
useCreateBlueprintConstructionMutation({ selection: { fields: { id: true } } })
useUpdateBlueprintConstructionMutation({ selection: { fields: { id: true } } })
useDeleteBlueprintConstructionMutation({})
```

## Examples

### List all blueprintConstructions

```typescript
const { data, isLoading } = useBlueprintConstructionsQuery({
  selection: { fields: { id: true, blueprintId: true, databaseId: true, schemaId: true, status: true, errorDetails: true, tableMap: true, constructedDefinition: true, constructedAt: true, createdAt: true, updatedAt: true } },
});
```

### Create a blueprintConstruction

```typescript
const { mutate } = useCreateBlueprintConstructionMutation({
  selection: { fields: { id: true } },
});
mutate({ blueprintId: '<UUID>', databaseId: '<UUID>', schemaId: '<UUID>', status: '<String>', errorDetails: '<String>', tableMap: '<JSON>', constructedDefinition: '<JSON>', constructedAt: '<Datetime>' });
```
