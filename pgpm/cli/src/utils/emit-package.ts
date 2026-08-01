/**
 * Shared module emission for the dials commands (`pgpm transform`,
 * `pgpm import`, `pgpm diff`). The implementation lives in `@pgpmjs/transform`
 * (`module-emit`) so every command renders through one writer; this module is
 * a thin re-export that keeps the CLI's local names (`writePackage`,
 * `EmitPackage`) stable.
 */
export type { PgpmModuleModel as EmitPackage } from '@pgpmjs/transform';
export { checkOverwrite, writeControlFile, writeModule as writePackage } from '@pgpmjs/transform';
