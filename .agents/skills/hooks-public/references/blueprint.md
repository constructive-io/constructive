# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An owned, executable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition before executing it with construct_blueprint(). Each blueprint tracks its execution status (draft/constructed/failed) and stores the ref_map of created table IDs after construction.

## Usage

```typescript
useBlueprintsQuery({ selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, status: true, constructedAt: true, errorDetails: true, refMap: true, constructedDefinition: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } } })
useBlueprintQuery({ id: '<UUID>', selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, status: true, constructedAt: true, errorDetails: true, refMap: true, constructedDefinition: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } } })
useCreateBlueprintMutation({ selection: { fields: { id: true } } })
useUpdateBlueprintMutation({ selection: { fields: { id: true } } })
useDeleteBlueprintMutation({})
```

## Examples

### List all blueprints

```typescript
const { data, isLoading } = useBlueprintsQuery({
  selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, status: true, constructedAt: true, errorDetails: true, refMap: true, constructedDefinition: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});
```

### Create a blueprint

```typescript
const { mutate } = useCreateBlueprintMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', databaseId: '<UUID>', name: '<String>', displayName: '<String>', description: '<String>', definition: '<JSON>', templateId: '<UUID>', status: '<String>', constructedAt: '<Datetime>', errorDetails: '<String>', refMap: '<JSON>', constructedDefinition: '<JSON>', definitionHash: '<UUID>', tableHashes: '<JSON>' });
```
