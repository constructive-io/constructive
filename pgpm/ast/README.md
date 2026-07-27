# @pgpmjs/ast

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/ast"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Fast%2Fpackage.json"/></a>
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
