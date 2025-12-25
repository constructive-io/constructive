export * from './core/boilerplate-scanner';
export * from './core/boilerplate-types';
export * from './core/class/pgpm';
export * from './core/template-scaffold';
export * from './export/export-meta';
export * from './export/export-migrations';
export * from './extensions/extensions';
export * from './modules/modules';
export * from './packaging/package';
export * from './packaging/transform';
export * from './resolution/deps';
export * from './resolution/resolve';
export * from './workspace/paths';
export * from './workspace/utils';

// Export package-files functionality (now integrated into core)
export * from './files';
export { PgpmInit } from './init/client';
export { cleanSql } from './migrate/clean';
export { PgpmMigrate } from './migrate/client';
export {
  DeployOptions, 
  DeployResult, 
  MigrateChange, 
  MigratePlanFile, 
  RevertOptions, 
  RevertResult, 
  StatusResult,
  VerifyOptions, 
  VerifyResult} from './migrate/types';
export { hashFile, hashString } from './migrate/utils/hash';
export { executeQuery,TransactionContext, TransactionOptions, withTransaction } from './migrate/utils/transaction';
export * from './roles';
