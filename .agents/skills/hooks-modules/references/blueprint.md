# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build.

## Usage

```typescript
useBlueprintsQuery({ selection: { fields: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } } })
useBlueprintQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } } })
useCreateBlueprintMutation({ selection: { fields: { id: true } } })
useUpdateBlueprintMutation({ selection: { fields: { id: true } } })
useDeleteBlueprintMutation({})
```

## Examples

### List all blueprints

```typescript
const { data, isLoading } = useBlueprintsQuery({
  selection: { fields: { createdAt: true, databaseId: true, definition: true, definitionHash: true, description: true, displayName: true, id: true, name: true, ownerId: true, tableHashes: true, templateId: true, updatedAt: true } },
});
```

### Create a blueprint

```typescript
const { mutate } = useCreateBlueprintMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', definition: '<JSON>', definitionHash: '<UUID>', description: '<String>', displayName: '<String>', name: '<String>', ownerId: '<UUID>', tableHashes: '<JSON>', templateId: '<UUID>' });
```
