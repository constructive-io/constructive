# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build.

## Usage

```typescript
useBlueprintsQuery({ selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } } })
useBlueprintQuery({ id: '<UUID>', selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } } })
useCreateBlueprintMutation({ selection: { fields: { id: true } } })
useUpdateBlueprintMutation({ selection: { fields: { id: true } } })
useDeleteBlueprintMutation({})
```

## Examples

### List all blueprints

```typescript
const { data, isLoading } = useBlueprintsQuery({
  selection: { fields: { id: true, ownerId: true, databaseId: true, name: true, displayName: true, description: true, definition: true, templateId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});
```

### Create a blueprint

```typescript
const { mutate } = useCreateBlueprintMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', databaseId: '<UUID>', name: '<String>', displayName: '<String>', description: '<String>', definition: '<JSON>', templateId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' });
```
