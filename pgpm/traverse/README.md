# @pgpmjs/traverse

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/traverse"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Ftraverse%2Fpackage.json"/></a>
</p>

Traversal primitives for the pgpm AST — the shared, dependency-free way to walk a
change's three script slots (`deploy` / `revert` / `verify`). Both the module AST's
`PgpmChangeAst` (`@pgpmjs/ast`) and the bundle's `BundleChange` (`@pgpmjs/bundle`)
structurally satisfy `ScriptSlots<S>`, so the same helpers walk either without
re-implementing the per-slot loop everywhere.

```ts
const SCRIPT_KINDS = ['deploy', 'revert', 'verify'] as const;

interface ScriptSlots<S> { deploy: S | null; revert: S | null; verify: S | null; }

forEachScript(change, (script, kind) => { /* visit present scripts */ });
const next = mapScripts(change, (script, kind) => transform(script)); // null-preserving
zipScripts(from, to, (kind, a, b) => { /* pair two revisions for diffing */ });
```

Pure leaf (depends only on `@pgpmjs/ast` for the `PgpmScriptKind` type). Used by
`@pgpmjs/bundle` (`createBundle` / `verifyBundle` / `diffBundles` / `transpileBundle`)
to replace hand-rolled `[deploy, revert, verify]` walks with one canonical primitive.
