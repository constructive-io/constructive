# blueprintTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible).

## Usage

```typescript
useBlueprintTemplatesQuery({ selection: { fields: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } } })
useBlueprintTemplateQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } } })
useCreateBlueprintTemplateMutation({ selection: { fields: { id: true } } })
useUpdateBlueprintTemplateMutation({ selection: { fields: { id: true } } })
useDeleteBlueprintTemplateMutation({})
```

## Examples

### List all blueprintTemplates

```typescript
const { data, isLoading } = useBlueprintTemplatesQuery({
  selection: { fields: { id: true, name: true, version: true, displayName: true, description: true, ownerId: true, visibility: true, categories: true, tags: true, definition: true, definitionSchemaVersion: true, source: true, complexity: true, copyCount: true, forkCount: true, forkedFromId: true, definitionHash: true, tableHashes: true, createdAt: true, updatedAt: true } },
});
```

### Create a blueprintTemplate

```typescript
const { mutate } = useCreateBlueprintTemplateMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', version: '<String>', displayName: '<String>', description: '<String>', ownerId: '<UUID>', visibility: '<String>', categories: '<String>', tags: '<String>', definition: '<JSON>', definitionSchemaVersion: '<String>', source: '<String>', complexity: '<String>', copyCount: '<Int>', forkCount: '<Int>', forkedFromId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' });
```
