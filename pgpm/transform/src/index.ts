export type {
  BundleScriptContext,
  ExtensionRoutingInput,
  NamespaceValidatorOptions,
  SchemaObjectRoute,
  SchemaTranspiler,
  SchemaTranspilerOptions,
} from './bundle-driver';
export {
  buildExtensionRouter,
  buildSchemaRouter,
  makeNamespaceValidator,
  makeSchemaTranspiler,
} from './bundle-driver';
export type { CatalogQueryable, CatalogSnapshot } from './catalog-check';
export { diffCatalogSnapshots, snapshotCatalog, withoutColumnOrder } from './catalog-check';
export type {
  CategoryProfile,
  ChangeCategory,
} from './categorize';
export {
  buildCategoryOf,
  categorizeChange,
  TIER_PROFILE,
} from './categorize';
export type {
  ClosureChange,
  ClosureInputChange,
  ClosureReason,
  FixtureClosure,
  ResolveFixtureClosureOptions,
} from './fixture-closure';
export { resolveFixtureClosure } from './fixture-closure';
export type {
  GranularityChange,
  RestructuredChange,
  RestructureModuleOptions,
  RestructureModuleResult,
} from './granularity-driver';
export {
  defaultChangeName,
  restructureChanges,
} from './granularity-driver';
export type { PgpmModuleModel } from './module-emit';
export { checkOverwrite, writeControlFile, writeModule } from './module-emit';
export type { ModuleSource, ModuleSourceChange } from './module-source';
export { loadModuleSource, stripTransactionWrapper } from './module-source';
export type { PartitionedPackageRows, PartitionExportRowsResult } from './partition';
export { parsePartitionConfig, partitionExportRows } from './partition';
export type {
  PartitionConfig,
  PartitionedChange,
  PartitionedPackage,
  PartitionInputChange,
  PartitionRule,
  PartitionUnit,
  PartitionUnitsResult,
  UnitSelector,
} from './partition-driver';
export {
  PartitionCycleError,
  partitionUnits,
  RESIDUAL_UNIT_PATH,
} from './partition-driver';
export type {
  SqlProgram,
  SqlStatementAst,
  SqlStatementSpan,
} from './program';
export { emitSqlProgram, parseSqlProgram } from './program';
export type {
  GeneratedScript,
  RegeneratedScripts,
} from './regen';
export {
  classifyScript,
  isStubScript,
  regenerateScripts,
} from './regen';
export type { ExportGranularity, RestructureExportRowsOptions, RestructureExportRowsResult } from './restructure';
export { EXPORT_GRANULARITIES, isExportGranularity, restructureExportRows } from './restructure';
export type {
  DiffInputChange,
  ObjectDelta,
  SemanticDeltaChange,
  SemanticDiffOptions,
  SemanticDiffResult,
  SemanticObjectDiff,
} from './semantic-diff-driver';
export {
  diffChangeSets,
  diffSchemas,
} from './semantic-diff-driver';
export * from '@pgsql/transform';
export { loadModule } from 'plpgsql-parser';
