# node-type-registry

Node type definitions for the Constructive blueprint system. Single source of truth for all Authz*, Data*, Field*, Relation*, View*, and Table* node types.

## Usage

```typescript
import { allNodeTypes, AuthzDirectOwner, DataId } from 'node-type-registry';

// Access individual node types
console.log(AuthzDirectOwner.parameter_schema);

// Get all node types as a flat array
console.log(allNodeTypes.length); // 50
```

## Preset (opt-in blueprint types)

```typescript
import { NodeTypeRegistryPreset } from 'node-type-registry/preset';

const sdl = await buildSchemaSDL({
  database: dbConfig.database,
  schemas,
  graphile: { extends: [NodeTypeRegistryPreset] },
});
```

This preset generates `@oneOf` typed GraphQL input types (`BlueprintDefinitionInput`, etc.) from the TS node type definitions. It is **not** included in `ConstructivePreset` — it must be explicitly added by consumers that need blueprint types.
