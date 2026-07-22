import { readModule } from './reader';
import { PgpmModuleAst } from './types';
import { writeModule, WriteModuleOptions } from './writer';

/**
 * Parse a pgpm module directory into a {@link PgpmModuleAst}.
 *
 * The module-level analog of `pgsql-parser`'s `parse()`: where that turns SQL
 * text into a PostgreSQL AST, this turns an on-disk pgpm module (plan + control
 * + deploy/revert/verify scripts) into a single typed tree. Alias of
 * {@link readModule}; the inverse of {@link deparseModule}.
 */
export function parseModule(dir: string): PgpmModuleAst {
  return readModule(dir);
}

/**
 * Deparse a {@link PgpmModuleAst} back to an on-disk pgpm module.
 *
 * The module-level analog of `pgsql-deparser`'s `deparse()`. With the default
 * `fromRaw: true` it is lossless (byte-exact round-trip of {@link parseModule});
 * with `fromRaw: false` it re-serializes the structured model, for operators
 * that mutate the AST first. Alias of {@link writeModule}.
 *
 * For in-memory deparse-to-string of individual parts, use `serializePlan` /
 * `serializeScript`.
 */
export function deparseModule(module: PgpmModuleAst, options: WriteModuleOptions = {}): void {
  writeModule(module, options);
}
