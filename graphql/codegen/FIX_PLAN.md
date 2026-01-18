# Fix Plan: Strict Select Type Validation

## Problem Summary

TypeScript allows selecting fields that don't exist in the GraphQL schema. For example:

```typescript
db.mutation.signIn(
  { input: { email: 'test@example.com', password: 'pass' } },
  { select: { apiToken: { select: {
    accessToken: true,      // Valid field
    refreshToken: true,     // DOESN'T EXIST - but no TS error!
  }}}}
)
```

This compiles successfully but fails at runtime with HTTP 400.

**Key insight**: TypeScript's excess property checking ONLY catches invalid fields when they are the ONLY fields. When mixed with valid fields (e.g., `accessToken: true, refreshToken: true`), TypeScript's structural typing allows the excess property.

## Root Cause

1. **Generated `*Select` types have all optional properties** - TypeScript allows excess properties on types with only optional fields

2. **The `const S extends PayloadSelect` constraint doesn't prevent extra keys** - An object with extra keys is still structurally a valid subtype

3. **Mixed valid + invalid fields bypass excess property checking** - This is the specific bug

## Solution Design (Validated)

### Approach: `DeepExact` Utility Type

A recursive type that validates select objects at all nesting levels:

```typescript
/**
 * Recursively validates select objects, rejecting unknown keys.
 * Returns `never` if any excess keys are found, causing a type error.
 */
type DeepExact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? {
        [K in keyof T]: K extends keyof Shape
          ? T[K] extends { select: infer NS }
            ? Shape[K] extends { select?: infer ShapeNS }
              ? { select: DeepExact<NS, NonNullable<ShapeNS>> }
              : T[K]
            : T[K]
          : never
      }
    : never  // Has excess keys - reject
  : never;   // Doesn't extend Shape - reject
```

**How it works:**
1. Checks if `T` extends `Shape` (basic structural check)
2. Checks if `T` has any excess keys via `Exclude<keyof T, keyof Shape>`
3. If excess keys exist, returns `never` causing a type error
4. For nested `select` objects, recursively applies the same validation

## Files to Modify

### 1. `src/cli/codegen/orm/select-types.ts`

Add the `DeepExact` utility type:

```typescript
/**
 * Recursively validates select objects, rejecting unknown keys.
 * Returns `never` if any excess keys are found at any nesting level.
 *
 * @example
 * // This will cause a type error because 'invalid' doesn't exist:
 * DeepExact<{ id: true, invalid: true }, { id?: boolean }> // => never
 */
export type DeepExact<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? {
        [K in keyof T]: K extends keyof Shape
          ? T[K] extends { select: infer NS }
            ? Shape[K] extends { select?: infer ShapeNS }
              ? { select: DeepExact<NS, NonNullable<ShapeNS>> }
              : T[K]
            : T[K]
          : never
      }
    : never
  : never;
```

### 2. `src/cli/codegen/orm/custom-ops-generator.ts`

Update the options parameter to use `DeepExact`:

**Current** (around line 200):
```typescript
options?: {
  select?: S;
}
```

**New**:
```typescript
options?: {
  select?: DeepExact<S, PayloadSelectType>;
}
```

This requires:
1. Import `DeepExact` from `../select-types`
2. Generate AST for the `DeepExact` type reference with `S` and the payload select type

### 3. `src/cli/codegen/orm/model-generator.ts`

Apply the same pattern to table model methods (`findMany`, `findFirst`, `create`, `update`):

**Current** (around line 145):
```typescript
findManyParam.typeAnnotation = t.tsTypeAnnotation(
  t.tsTypeReference(t.identifier('FindManyArgs'), t.tsTypeParameterInstantiation([
    t.tsTypeReference(t.identifier('S')),
    // ...
  ]))
);
```

**New**: Wrap `S` with `DeepExact<S, SelectType>`.

### 4. Update Imports in Generated Files

Add `DeepExact` to the type imports:

```typescript
import type { ..., DeepExact } from '../select-types';
```

## Implementation Steps

1. **Add `DeepExact` to `select-types.ts`** (the template file)
   - Add the type with JSDoc documentation
   - Export it

2. **Update `custom-ops-generator.ts`**
   - Add `DeepExact` to the imports list (line ~295)
   - Modify `buildOperationMethod` to wrap the select type parameter

3. **Update `model-generator.ts`**
   - Add `DeepExact` to the imports list (line ~124-127)
   - Modify `findMany`, `findFirst`, `create`, `update` arg types

4. **Regenerate and verify**
   - Run `pnpm build && pnpm example:codegen:orm`
   - Test that invalid fields cause TS errors
   - Test that valid fields still work

5. **Run tests**
   - `pnpm test`
   - Verify no regressions

## Testing the Fix

After implementation, these scenarios should work correctly:

```typescript
// ERROR: 'refreshToken' doesn't exist (nested)
db.mutation.signIn(
  { input: { email: 't', password: 'p' } },
  { select: { apiToken: { select: { accessToken: true, refreshToken: true } } } }
);
// Expected error: Type 'true' is not assignable to type 'never'
//             or: Object literal may only specify known properties

// ERROR: 'invalid' doesn't exist (top-level)
db.user.findMany({ select: { id: true, invalid: true } });

// WORKS: valid fields only
db.user.findMany({ select: { id: true, username: true } });

// WORKS: empty select
db.user.findMany({ select: {} });

// WORKS: no select (returns all fields)
db.user.findMany();

// WORKS: nested valid fields
db.mutation.signIn(
  { input: { email: 't', password: 'p' } },
  { select: { apiToken: { select: { accessToken: true } } } }
);
```

## Verified Test Results

The `DeepExact` approach has been validated:
- ✅ Catches invalid top-level fields
- ✅ Catches invalid nested fields (the main bug)
- ✅ Catches mixed valid + invalid fields (the tricky case)
- ✅ Allows valid fields only
- ✅ Allows empty select objects
- ✅ Allows boolean shorthand (e.g., `apiToken: true`)
- ✅ Allows omitting select entirely
