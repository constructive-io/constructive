import { readFileSync } from 'fs';
import { parse, parseTypes } from './index';
import { deparse } from 'pgsql-deparser';
import { InsertOne, InsertMany } from './utils';

interface ParserConfig {
  schema?: string;
  table: string;
  singleStmts?: boolean;
  conflict?: string[];
  conflictDoNothing?: boolean;
  headers?: string[];
  delimeter?: string;
  json?: boolean;
  input?: string;
  debug?: boolean;
  fields: Record<string, unknown>;
}

interface CsvOptions {
  headers?: string[];
  separator?: string;
}

export class Parser {
  private config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = config;
  }

  async parse(data?: Record<string, unknown>[]): Promise<string | void> {
    const config = this.config;
    const { schema, table, singleStmts, conflict, conflictDoNothing, headers, delimeter } = config;

    const opts: CsvOptions = {};
    if (headers) opts.headers = headers;
    if (delimeter) opts.separator = delimeter;

    let records: Record<string, unknown>[];
    if (typeof data === 'undefined') {
      if (!config.input) {
        throw new Error('input is required when data is not provided');
      }
      if (config.json || config.input.endsWith('.json')) {
        records = JSON.parse(readFileSync(config.input, 'utf-8'));
      } else {
        records = await parse(config.input, opts);
      }
    } else {
      if (!Array.isArray(data)) {
        throw new Error('data is not an array');
      }
      records = data;
    }

    if (config.debug) {
      console.log(records);
      return;
    }

    const types = parseTypes(config as { fields: Record<string, unknown> });

    if (singleStmts) {
      const stmts = records.map((record) =>
        InsertOne({
          schema,
          table,
          types,
          record,
          conflict,
          conflictDoNothing
        })
      );
      return deparse(stmts);
    } else {
      const stmt = InsertMany({
        schema,
        table,
        types,
        records,
        conflict,
        conflictDoNothing
      });
      return deparse([stmt]);
    }
  }
}
