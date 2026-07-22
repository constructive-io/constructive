/**
 * @pgpmjs/ast — the pgpm module AST layer.
 *
 * Two things live here:
 *   - `files/*` — the low-level file parsers/writers (plan, control, SQL header,
 *     scripts) and their types. These are the primitives everything else composes.
 *   - `module/*` — the unified {@link PgpmModuleAst}: `readModule`/`writeModule`
 *     (parse/deparse a whole pgpm module) built by composing the `files/*` parsers,
 *     lossless round-trip.
 *
 * This package is a pure leaf (no DB, no deploy engine); `@pgpmjs/core` and the
 * bundle/artifact layer build on top of it.
 */
export * from './files';
export * from './module';
export { parseAuthor } from './utils/author';
export type { ParsedAuthor } from './utils/author';
