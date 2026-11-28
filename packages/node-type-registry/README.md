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

Node type definitions for the Constructive blueprint system: every Authz*, Data*, Relation*, View* and Table* node type, with the module presets and content presets.

## Usage

```typescript
import { allNodeTypes, AuthzDirectOwner, DataId } from 'node-type-registry';

// Access individual node types
console.log(AuthzDirectOwner.parameter_schema);

// Get all node types as a flat array
console.log(allNodeTypes.length);
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
        { $type: 'DataDirectOwner', data: { include_id: false } },
      ],
      fields: [
        { name: 'title', type: { name: 'text' }, is_not_null: true },
        { name: 'description', type: { name: 'text' } },
      ],
      policies: [{ $type: 'AuthzDirectOwner', data: { entity_field: 'owner_id' } }],
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

### Where the source lives

`src/` is a copy of the registry that the backend deploys, generated files included. Change a node type or a preset there, then copy it here from a checkout of the backend's repository:

```bash
pnpm sync:registry <checkout>          # copies src/
pnpm sync:registry --check <checkout>  # lists the files that differ, and exits 1 if one does
```

## Authz nodes: plain words and closed parameters

Every `Authz*` node carries plain words, so a person or an agent can tell who a policy lets in without reading SQL: `summary` (one sentence), and `use_when`, `avoid_when` and `risks`.

Each Authz node's `parameter_schema` is closed (`additionalProperties: false`), so a key the backend would store and ignore is refused instead of making a policy wider than meant. Keys the backend writes when it stores a policy (the member list it resolves, a capability mask, a compiled condition) are listed with `readOnly: true`: a stored policy may hold them, and a rule a caller writes leaves them out. A value that holds an Authz expression (`AuthzComposite`'s data, its `AND`/`OR`/`NOT` parts, `AuthzColumnSecurity.authz`) is marked `format: 'authz-expression'`: one key, which is `AND` or `OR` with a list, `NOT` with one expression, or the name of an Authz node with that node's data. A raw expression cannot be written.

`pnpm generate:reference --outdir <folder>` writes the nodes as a Markdown reference page, `authz-node-reference.md`, with no date or version in it, so a copy that differs from a fresh render is stale. The page is made at dev time and is not part of the runtime exports.

## Blueprint JSON Schema

`pnpm generate:types` also writes `src/blueprint-schema.generated.ts`, exported as `blueprintDefinitionJsonSchema`: a draft-07 JSON Schema of a blueprint definition, made from the same structural types as `blueprint-types.generated.ts`. Each node's, policy's and check constraint's `data` points at that node's `parameter_schema` in the form a caller writes it (without its `readOnly` keys), so an Authz policy in a blueprint is checked against its closed parameters. A validator needs the formats `column-ref`, `uuid`, `function-ref` and `labeled` registered.

## JSON artifacts (data distribution)

The build also emits the registry as pure-data JSON alongside the JS, so it can be consumed **as data** rather than as executable code:

- `presets.json` — `{ registryVersion, presets }` (the module presets)
- `node-types.json` — `{ registryVersion, nodeTypes }`

```typescript
import presets from 'node-type-registry/presets.json';
```

**Why two tiers.** Trusted, first-party consumers (the dashboard, `@agentic-kit/pi`) import this package over npm — a pinned, reviewed dependency; drift is controlled by the version bump. Untrusted or distributed consumers (appstash, third-party agents) should **not** install and execute a package just to get a preset — they fetch these JSON files from a pinned + verified source instead. Same content, no code path, no lifecycle scripts.

`registryVersion` lets a consumer range-check the data against the tool code it was built for (mirrors the skills manifest's `compatibleSkillsRange`) and refuse data that runs ahead of its code. The backend's provision resolver remains the final gate on any module set.

Regenerated automatically by `pnpm build`; run standalone with `pnpm generate:json`.
