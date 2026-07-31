export * from './core/boilerplate-scanner';
export * from './core/boilerplate-types';
export * from './core/class/pgpm';
export * from './core/template-scaffold';
export * from './extensions';
export * from './modules/modules';
export * from './packaging/check';
export * from './packaging/package';
export * from './packaging/sync-versions';
export * from './packaging/transform';
export * from './rebundle';
export * from './resolution/deps';
export * from './resolution/resolve';
export * from './workspace/minimal';
export * from './workspace/paths';
export * from './workspace/utils';

// Re-export the module AST layer (moved to the @pgpmjs/ast leaf package)
export * from './apply';
export * from './bundle';
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
export * from './refactor';
export * from './roles';
export { parseAuthor } from '@pgpmjs/ast';
export * from '@pgpmjs/ast/files';
export * from '@pgpmjs/ast/module';
