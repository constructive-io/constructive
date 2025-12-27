// CSV seeding utilities (uses COPY protocol for fast bulk loading)
export { exportCsv, loadCsv, loadCsvMap } from './csv';

// JSON seeding utilities (uses INSERT statements)
export { insertJson, insertJsonMap } from './json';

// SQL file execution utilities
export { execSql, loadSql, loadSqlFiles } from './sql';

// Types
export type {
  ClientInput,
  CopyableClient,
  CsvSeedMap,
  JsonSeedMap,
  QueryableClient
} from './types';

// Utility for unwrapping client wrappers
export { unwrapClient } from './types';
