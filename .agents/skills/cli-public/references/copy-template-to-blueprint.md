# copyTemplateToBlueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a new blueprint by copying a template definition. Checks visibility: owners can always copy their own templates, others require public visibility. Increments the template copy_count. Returns the new blueprint ID.

## Usage

```bash
csdk copy-template-to-blueprint --input.clientMutationId <String> --input.templateId <UUID> --input.databaseId <UUID> --input.ownerId <UUID> --input.nameOverride <String> --input.displayNameOverride <String>
```

## Examples

### Run copyTemplateToBlueprint

```bash
csdk copy-template-to-blueprint --input.clientMutationId <String> --input.templateId <UUID> --input.databaseId <UUID> --input.ownerId <UUID> --input.nameOverride <String> --input.displayNameOverride <String>
```
