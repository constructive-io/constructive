// Re-export everything from pg-seed (core seeding utilities)
export {
  // Types
  type ClientInput,
  type CopyableClient,
  type CsvSeedMap,
  // SQL utilities
  execSql,
  // CSV utilities
  exportCsv,
  // JSON utilities
  insertJson,
  insertJsonMap,
  type JsonSeedMap,
  loadCsv,
  loadCsvMap,
  loadSql,
  loadSqlFiles,
  type QueryableClient,
  // Utility
  unwrapClient
} from 'pg-seed';

// pgpm integration (requires @pgpmjs/core)
export { deployPgpm, loadPgpm } from './pgpm';
