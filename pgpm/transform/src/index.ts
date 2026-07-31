export * from '@pgsql/transform';
export { loadModule } from 'plpgsql-parser';
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
  SqlProgram,
  SqlStatementAst,
  SqlStatementSpan,
} from './program';
export { emitSqlProgram, parseSqlProgram } from './program';
