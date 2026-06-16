# graphile-ltree

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

PostGraphile v5 plugin for PostgreSQL's ltree hierarchical data type.

Auto-detects ltree columns, exposes slash-path folder fields, and provides containment/glob filter operators for hierarchical data.

## Features

- **Ltree scalar type** — ltree columns are exposed as the `Ltree` GraphQL scalar instead of `String`
- **Folder fields** — virtual `{column}Folder` fields that convert dot-notation to slash paths (`projects.alpha.docs` -> `/projects/alpha/docs`)
- **Connection filter operators** — `isAncestorOf`, `isDescendantOf`, `matchesGlob` for containment and pattern queries
- **Auto-detection** — no configuration needed; the plugin scans the database for ltree columns
- **ltree_helpers integration** — automatically uses `ltree_helpers.to_path()` / `to_query()` when available

## Usage

```typescript
import { GraphileLtreePreset } from 'graphile-ltree';

const preset = {
  extends: [GraphileLtreePreset],
};
```

Or add to the Constructive preset (already included):

```typescript
import { ConstructivePreset } from 'graphile-settings/presets';
```

## GraphQL API

### Folder fields

For a table with an ltree column `path`:

```graphql
{
  allFiles {
    nodes {
      path          # "projects.alpha.docs" (raw ltree)
      pathFolder    # "/projects/alpha/docs" (slash-delimited)
    }
  }
}
```

### Filter operators

```graphql
# Files under /projects/alpha (containment)
{
  allFiles(where: { path: { isAncestorOf: "projects.alpha" } }) {
    nodes { filename pathFolder }
  }
}

# Ancestors of a deep path
{
  allFiles(where: { path: { isDescendantOf: "projects.alpha.docs.images" } }) {
    nodes { filename pathFolder }
  }
}

# Glob/lquery pattern matching
{
  allFiles(where: { path: { matchesGlob: "projects.*.docs" } }) {
    nodes { filename pathFolder }
  }
}
```

## Plugins

| Plugin | Purpose |
|--------|---------|
| `LtreeExtensionDetectionPlugin` | Scans pgRegistry for ltree/lquery codecs |
| `LtreeCodecPlugin` | Registers `Ltree` scalar, maps ltree/lquery types |
| `LtreeFolderFieldPlugin` | Adds virtual `{column}Folder` fields |
| `createLtreeOperatorFactory()` | Connection filter operators for containment/glob |
