# @pgpmjs/ast

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

The pgpm **module AST** — the plan/control/SQL-header parsers (`files/*`) and the
lossless module read/write layer (`module/*`) that composes them into a single typed
`PgpmModuleAst`.

- `readModule(dir)` / `parseModule(dir)` — parse a pgpm module directory into a typed AST.
- `writeModule(ast, { outDir })` / `deparseModule(ast)` — serialize the AST back to a
  module (byte-lossless for modules read via `readModule`).
- `files/*` — the low-level parsers/writers everything else composes; no re-implementation.

This package is a pure leaf (no database, no deploy engine). `@pgpmjs/core` and the
migration-bundle artifact layer build on top of it. See the `pgpm-migration-bundle` skill
for how the bundle layer uses this AST.
