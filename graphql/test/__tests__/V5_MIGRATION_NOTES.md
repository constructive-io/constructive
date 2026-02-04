# PostGraphile v4 to v5 Migration Notes

This document explains the differences between PostGraphile v4 and v5 that caused snapshot changes in the test suite. These changes are expected and reflect intentional improvements in v5.

## Table of Contents

1. [Spelling Changes](#1-spelling-changes)
2. [New GraphQL Directives](#2-new-graphql-directives)
3. [Removed Fields (MinimalPreset)](#3-removed-fields-minimalpreset-disables-noderelay)
4. [Naming Convention Changes](#4-naming-convention-changes-inflektplugin)
5. [Type Nullability Changes](#5-type-nullability-changes)
6. [Field/Argument Ordering](#6-fieldargument-ordering)
7. [Added Descriptions](#7-added-descriptions)
8. [Skipped Plugin Tests](#8-skipped-plugin-tests)

---

## 1. Spelling Changes

PostGraphile v5 adopts American English spelling throughout the codebase.

| v4 | v5 |
|----|-----|
| `behaviour` | `behavior` |

This affects configuration options, documentation, and any generated schema descriptions that reference these terms.

---

## 2. New GraphQL Directives

### `@oneOf` Directive

PostGraphile v5 adds support for the `@oneOf` directive, which is part of the GraphQL specification for input objects. This directive indicates that exactly one field of an input object must be provided.

**v5 Schema Example:**
```graphql
directive @oneOf on INPUT_OBJECT

input UserUniqueCondition @oneOf {
  id: Int
  username: String
  email: String
}
```

This directive appears in introspection results and affects how input validation is performed.

---

## 3. Removed Fields (MinimalPreset Disables Node/Relay)

PostGraphile v5's `MinimalPreset` disables Node/Relay-related plugins by default, resulting in several fields being removed from the schema.

### Removed Fields

| Field | Purpose | Why Removed |
|-------|---------|-------------|
| `query` | Relay 1 compatibility (root query reference) | Relay 1 is deprecated |
| `user(id: Int!)` | Single-row lookup by primary key | Node interface disabled |
| `userByUsername(username: String!)` | Unique column lookup | Node interface disabled |

### v4 Schema (with Node/Relay)
```graphql
type Query {
  query: Query!
  user(id: Int!): User
  userByUsername(username: String!): User
  allUsers(first: Int, ...): UsersConnection
}
```

### v5 Schema (MinimalPreset)
```graphql
type Query {
  allUsers(first: Int, ...): UserConnection
}
```

To restore these fields in v5, you would need to explicitly enable the Node-related plugins or use a different preset.

---

## 4. Naming Convention Changes (InflektPlugin)

PostGraphile v5 uses an updated inflection system that produces different type names.

### Connection Types (Plural to Singular)

| v4 | v5 |
|----|-----|
| `UsersConnection` | `UserConnection` |
| `PostsConnection` | `PostConnection` |
| `CommentsConnection` | `CommentConnection` |

### Enum Types (Plural to Singular)

| v4 | v5 |
|----|-----|
| `UsersOrderBy` | `UserOrderBy` |
| `PostsOrderBy` | `PostOrderBy` |

### PascalCase Improvements

| v4 | v5 |
|----|-----|
| `Metaschema` | `MetaSchema` |

The v5 inflector properly handles compound words and applies consistent PascalCase formatting.

### Custom Inflector Configuration

If you need to customize inflection behavior, v5 uses the `GraphileConfig.Plugin` format:

```typescript
const CustomInflectionPlugin: GraphileConfig.Plugin = {
  name: "CustomInflectionPlugin",
  inflection: {
    replace: {
      connectionType(previous, options, typeName) {
        // Custom logic here
        return `${typeName}Connection`;
      }
    }
  }
};
```

---

## 5. Type Nullability Changes

PostGraphile v5 changes the default nullability of list items.

### v4 Behavior
List items were wrapped with `NON_NULL`:
```graphql
type Query {
  allUsers: [User!]!  # Non-null list of non-null items
}
```

### v5 Behavior
List items are nullable by default:
```graphql
type Query {
  allUsers: [User]!  # Non-null list of nullable items
}
```

This change aligns with GraphQL best practices for forward compatibility and partial failure handling.

### Introspection Difference

**v4:**
```json
{
  "kind": "LIST",
  "ofType": {
    "kind": "NON_NULL",
    "ofType": { "kind": "OBJECT", "name": "User" }
  }
}
```

**v5:**
```json
{
  "kind": "LIST",
  "ofType": { "kind": "OBJECT", "name": "User" }
}
```

---

## 6. Field/Argument Ordering

PostGraphile v5 uses a different ordering strategy for fields and arguments.

### Argument Ordering

The `orderBy` argument has moved to the end of the argument list:

**v4:**
```graphql
allUsers(
  first: Int
  last: Int
  orderBy: [UsersOrderBy!]
  condition: UserCondition
  after: Cursor
  before: Cursor
): UsersConnection
```

**v5:**
```graphql
allUsers(
  first: Int
  last: Int
  after: Cursor
  before: Cursor
  condition: UserCondition
  orderBy: [UserOrderBy!]
): UserConnection
```

### Field Ordering

Some fields may appear in a different order within types. This affects introspection results but does not change functionality.

---

## 7. Added Descriptions

PostGraphile v5 adds descriptions to fields that were previously undocumented.

### `_meta` Field

The `_meta` field from `MetaSchemaPlugin` now includes a description:

**v5:**
```graphql
type Query {
  """
  Metadata about the GraphQL schema and server configuration.
  """
  _meta: MetaSchema
}
```

These descriptions improve schema documentation and IDE/tooling support.

---

## 8. Skipped Plugin Tests

### `graphile-test.plugins.test.ts`

This test file is skipped because it tests v4-style plugins that are incompatible with PostGraphile v5.

### v4 Plugin Format (Incompatible)
```typescript
const TestPlugin = (builder: any) => {
  builder.hook('GraphQLObjectType:fields', (fields, build, context) => {
    const { scope } = context;
    if (scope.isRootQuery) {
      return build.extend(fields, {
        testPluginField: {
          type: build.graphql.GraphQLString,
          resolve: () => 'test-plugin-value'
        }
      });
    }
    return fields;
  });
};

// Usage in v4
{
  appendPlugins: [TestPlugin]
}
```

### v5 Plugin Format (Required)
```typescript
const TestPlugin: GraphileConfig.Plugin = {
  name: "TestPlugin",
  version: "1.0.0",

  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, build, context) {
        const { scope } = context;
        if (scope.isRootQuery) {
          return build.extend(fields, {
            testPluginField: {
              type: build.graphql.GraphQLString,
              resolve: () => 'test-plugin-value'
            }
          });
        }
        return fields;
      }
    }
  }
};

// Usage in v5
{
  plugins: [TestPlugin]
}
```

### Key Differences

| Aspect | v4 | v5 |
|--------|-----|-----|
| Format | Function that receives `builder` | Object implementing `GraphileConfig.Plugin` |
| Hook registration | `builder.hook('HookName', callback)` | `schema.hooks.HookName` method |
| Hook naming | `GraphQLObjectType:fields` | `GraphQLObjectType_fields` |
| Plugin metadata | None required | `name` and `version` required |
| Configuration | `appendPlugins` array | `plugins` array in preset |

---

## Summary of Snapshot Updates Required

When updating snapshots from v4 to v5, expect the following changes:

1. **Text changes:** `behaviour` replaced with `behavior`
2. **Schema additions:** `@oneOf` directive present
3. **Removed fields:** `query`, single-row lookups (if using MinimalPreset)
4. **Type renames:** `UsersConnection` to `UserConnection`, etc.
5. **Nullability:** List items no longer wrapped in `NON_NULL`
6. **Ordering:** Arguments and fields may appear in different order
7. **Descriptions:** New descriptions on previously undocumented fields

These changes are intentional and represent improvements in PostGraphile v5. Update your snapshots accordingly after verifying the schema changes are correct.
