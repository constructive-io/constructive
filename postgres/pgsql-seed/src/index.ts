// Re-export everything from pg-seed (core seeding utilities)
export {
  // CSV utilities
  exportCsv,
  loadCsv,
  loadCsvMap,
  // JSON utilities
  insertJson,
  insertJsonMap,
  // SQL utilities
  execSql,
  loadSql,
  loadSqlFiles,
  // Types
  type ClientInput,
  type CopyableClient,
  type CsvSeedMap,
  type JsonSeedMap,
  type QueryableClient,
  // Utility
  unwrapClient
} from 'pg-seed';

// pgpm integration (requires @pgpmjs/core)
export { deployPgpm, loadPgpm } from './pgpm';
