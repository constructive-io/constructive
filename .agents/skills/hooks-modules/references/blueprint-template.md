# blueprintTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible).

## Usage

```typescript
useBlueprintTemplatesQuery({ selection: { fields: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } } })
useBlueprintTemplateQuery({ id: '<UUID>', selection: { fields: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } } })
useCreateBlueprintTemplateMutation({ selection: { fields: { id: true } } })
useUpdateBlueprintTemplateMutation({ selection: { fields: { id: true } } })
useDeleteBlueprintTemplateMutation({})
```

## Examples

### List all blueprintTemplates

```typescript
const { data, isLoading } = useBlueprintTemplatesQuery({
  selection: { fields: { categories: true, complexity: true, copyCount: true, createdAt: true, definition: true, definitionHash: true, definitionSchemaVersion: true, description: true, displayName: true, forkCount: true, forkedFromId: true, id: true, name: true, ownerId: true, source: true, tableHashes: true, tags: true, updatedAt: true, version: true, visibility: true } },
});
```

### Create a blueprintTemplate

```typescript
const { mutate } = useCreateBlueprintTemplateMutation({
  selection: { fields: { id: true } },
});
mutate({ categories: '<String>', complexity: '<String>', copyCount: '<Int>', definition: '<JSON>', definitionHash: '<UUID>', definitionSchemaVersion: '<String>', description: '<String>', displayName: '<String>', forkCount: '<Int>', forkedFromId: '<UUID>', name: '<String>', ownerId: '<UUID>', source: '<String>', tableHashes: '<JSON>', tags: '<String>', version: '<String>', visibility: '<String>' });
```
