# node-type-registry

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/node-type-registry"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fnode-type-registry%2Fpackage.json"/></a>
</p>

Node type definitions for the Constructive blueprint system. Single source of truth for all Authz*, Data*, Relation*, View*, and Table* node types.

## Usage

```typescript
import { allNodeTypes, AuthzDirectOwner, DataId } from 'node-type-registry';

// Access individual node types
console.log(AuthzDirectOwner.parameter_schema);

// Get all node types as a flat array
console.log(allNodeTypes.length); // 52
```

## Blueprint Types (generated)

The package exports TypeScript types that match the JSONB shape expected by `construct_blueprint()`. These provide client-side autocomplete and type safety when building blueprint definitions — the GraphQL API itself accepts plain JSONB.

```typescript
import type {
  BlueprintDefinition,
  BlueprintTable,
  BlueprintNode,
  BlueprintRelation,
  BlueprintField,
  BlueprintIndex,
} from 'node-type-registry';

const definition: BlueprintDefinition = {
  tables: [
    {
      table_name: 'tasks',
      nodes: [
        'DataId',
        'DataTimestamps',
        'DataDirectOwner',
      ],
      fields: [
        { name: 'title', type: 'text', is_not_null: true },
        { name: 'description', type: 'text' },
      ],
      policies: [{ $type: 'AuthzDirectOwner' }],
    },
  ],
  relations: [
    {
      $type: 'RelationBelongsTo',
      source_table: 'tasks',
      target_table: 'projects',
      delete_action: 'c',
    },
  ],
  unique_constraints: [
    {
      table_name: 'tasks',
      columns: ['title', 'owner_id'],
    },
  ],
};
```

### Regenerating types

When node type definitions are added or modified, regenerate with:

```bash
cd graphql/node-type-registry && pnpm generate:types
```

This produces `src/blueprint-types.generated.ts` from the TS node type source of truth.

## Codegen: SQL seed

Generate SQL seed scripts for `node_type_registry` table:

```bash
cd graphql/node-type-registry && pnpm generate:seed --pgpm ../../constructive-db/packages/metaschema
```
