# copyTemplateToBlueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

## Usage

```typescript
const { mutate } = useCopyTemplateToBlueprintMutation(); mutate({ input: { databaseId: '<UUID>', displayNameOverride: '<String>', nameOverride: '<String>', ownerId: '<UUID>', templateId: '<UUID>' } });
```

## Examples

### Use useCopyTemplateToBlueprintMutation

```typescript
const { mutate, isLoading } = useCopyTemplateToBlueprintMutation();
mutate({ input: { databaseId: '<UUID>', displayNameOverride: '<String>', nameOverride: '<String>', ownerId: '<UUID>', templateId: '<UUID>' } });
```
