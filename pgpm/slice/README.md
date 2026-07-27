# @pgpmjs/slice

PGPM plan slicing: split a monolithic pgpm plan into independently deployable packages.

- **`slicePlan`** — assign changes to packages via explicit lists or glob **pattern strategies** (`minimatch`), preserving plan order, tags, and cross-package `requires` validation.
- **Opt-in AST dependency closure** — a cherry-picked slice (`closure: true`) automatically pulls in its TRUE transitive dependencies, discovered from the deploy SQL itself via [`@pgpmjs/transform`](../transform)'s `classifyStatements`: function calls (including inside PL/pgSQL bodies), table/view/type references, and FK targets — even when not declared in plan `requires` headers. The result includes a full report of what was auto-included and why (`requires` vs `ast`), plus `dynamicSqlChanges` and `unresolvedReferences`.
- **`writeSliceResult` / `generatePlanContent`** — write sliced packages back out as pgpm module trees.

## Installation

```bash
npm install @pgpmjs/slice
```

## Usage

```typescript
import { loadModule, slicePlan, writeSliceResult } from '@pgpmjs/slice';

await loadModule(); // WASM parser init — required before closure-enabled slicing

const result = slicePlan(plan, {
  strategy: {
    type: 'pattern',
    slices: [
      { package: 'api', patterns: ['schemas/api/**'], closure: true }
    ]
  },
  closure: { moduleDir } // where deploy/ scripts live
});

// result.closure => {
//   autoIncluded: [{ change, package, requiredBy, reason: 'requires' | 'ast', ref? }],
//   dynamicSqlChanges,
//   unresolvedReferences
// }
```

Default behavior (no `closure`) is unchanged from the classic slicer: dependency edges come only from declared plan `requires` headers.
