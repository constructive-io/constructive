/**
 * pgpm-ast: the unified in-memory AST for pgpm modules ("AST for the migrations").
 *
 * Composes the existing file-level parsers (plan, control, SQL header) into a
 * single typed {@link PgpmModuleAst} object that operators transform, then writes
 * it back losslessly. Lives under `pgpm/core/src/ast` so it can later be lifted
 * into a standalone leaf `pgpm/ast` package as a pure file move.
 */
export * from './parse';
export * from './reader';
export * from './roundtrip';
export * from './types';
export * from './writer';
