import csv from 'csv-parser';
import { createReadStream, readFileSync } from 'fs';
import { load as parseYAML } from 'js-yaml';
import { ast, nodes } from '@pgsql/utils';
import type { Node } from '@pgsql/types';
import {
  makeBoundingBox,
  makeLocation,
  getRelatedField,
  wrapValue
} from './utils';

// Common NULL tokens used in CSV exports
const NULL_TOKENS = new Set(['NULL', 'null', '\\N', 'NA', 'N/A', 'n/a', '#N/A', '']);

function isNumeric(str: unknown): boolean {
  if (typeof str === 'number') return true;
  if (typeof str !== 'string') return false;
  return (
    !isNaN(str as unknown as number) &&
    !isNaN(parseFloat(str))
  );
}

/**
 * Check if a value represents a NULL token
 */
const isNullToken = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    return NULL_TOKENS.has(value.trim());
  }
  return false;
};

const parseJson = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  return value ? JSON.stringify(value) : undefined;
};

/**
 * PostgreSQL interval object type as returned by node-postgres
 */
interface PgInterval {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

/**
 * Convert a PostgreSQL interval object to a PostgreSQL interval string.
 * node-postgres returns intervals as objects like { hours: 12, minutes: 6, seconds: 41 }
 */
const formatInterval = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const interval = value as PgInterval;
    const parts: string[] = [];
    
    if (interval.years) parts.push(`${interval.years} year${interval.years !== 1 ? 's' : ''}`);
    if (interval.months) parts.push(`${interval.months} mon${interval.months !== 1 ? 's' : ''}`);
    if (interval.days) parts.push(`${interval.days} day${interval.days !== 1 ? 's' : ''}`);
    
    // Build time component
    const hours = interval.hours || 0;
    const minutes = interval.minutes || 0;
    const seconds = interval.seconds || 0;
    const milliseconds = interval.milliseconds || 0;
    
    if (hours || minutes || seconds || milliseconds) {
      const totalSeconds = seconds + milliseconds / 1000;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${totalSeconds.toFixed(milliseconds ? 6 : 0).padStart(milliseconds ? 9 : 2, '0')}`;
      parts.push(timeStr);
    }
    
    return parts.length > 0 ? parts.join(' ') : '00:00:00';
  }
  return undefined;
};

/**
 * Escape a single array element for PostgreSQL array literal format.
 * Handles: NULL, quotes, backslashes, commas, braces, and whitespace.
 */
const escapeArrayElement = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  const str = String(value);
  // Check if the value needs quoting
  const needsQuoting = /[,{}"\\]/.test(str) || str.trim() !== str || str === '' || NULL_TOKENS.has(str);
  if (needsQuoting) {
    // Escape backslashes and quotes, then wrap in quotes
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
};

/**
 * Convert an array to PostgreSQL array literal format with proper escaping.
 */
const psqlArray = (value: unknown): string | undefined => {
  if (Array.isArray(value) && value.length) {
    return `{${value.map(escapeArrayElement).join(',')}}`;
  }
  return undefined;
};

export const parse = <T = Record<string, unknown>>(path: string, opts?: csv.Options): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const results: T[] = [];
    createReadStream(path)
      .pipe(csv(opts))
      .on('data', (data: T) => results.push(data))
      .on('error', (er: Error) => {
        reject(er);
      })
      .on('end', () => {
        resolve(results);
      });
  });

export const readConfig = (config: string): unknown => {
  let configValue: unknown;
  if (config.endsWith('.js')) {
    configValue = require(config);
  } else if (config.endsWith('json')) {
    configValue = JSON.parse(readFileSync(config, 'utf-8'));
  } else if (config.endsWith('yaml') || config.endsWith('yml')) {
    configValue = parseYAML(readFileSync(config, 'utf-8'));
  } else {
    throw new Error('unsupported config!');
  }
  return configValue;
};

const getFromValue = (from: string | string[]): string[] => {
  if (Array.isArray(from)) return from;
  return [from];
};

/**
 * Cleanse empty strings and NULL tokens to null
 */
const cleanseEmptyStrings = (str: unknown): unknown => {
  if (isNullToken(str)) return null;
  return str;
};

const parseBoolean = (str: unknown): boolean | null => {
  if (typeof str === 'boolean') {
    return str;
  } else if (typeof str === 'string') {
    const s = str.toLowerCase();
    if (s === 'true') {
      return true;
    } else if (s === 't') {
      return true;
    } else if (s === 'f') {
      return false;
    } else if (s === 'false') {
      return false;
    }
    return null;
  } else {
    return null;
  }
};

const getValuesFromKeys = <T extends Record<string, unknown>>(object: T, keys: string[]): unknown[] => 
  keys.map((key) => object[key]);

const identity = <T>(a: T): T => a;

const isEmpty = (value: unknown): boolean => value === null || typeof value === 'undefined';

interface FieldOptions {
  type?: string;
  from?: string | string[];
  parse?: <T>(value: T) => T;
  wrap?: string[];
  wrapAst?: (val: Node) => Node;
  cast?: string;
  schema?: string;
  table?: string;
  refType?: string;
  refKey?: string;
  refField?: string;
  required?: boolean;
}

/**
 * Error thrown when a required field is missing or has an invalid value
 */
export class ValidationError extends Error {
  constructor(
    public readonly fieldName: string,
    public readonly rawValue: unknown,
    public readonly expectedType: string,
    public readonly reason: string
  ) {
    super(`Validation error for field "${fieldName}": ${reason}. Expected type: ${expectedType}, got value: ${JSON.stringify(rawValue)}`);
    this.name = 'ValidationError';
  }
}

type CoercionFunc = (record: Record<string, unknown>) => Node;

/**
 * Helper to create a NULL node or throw if field is required
 */
const makeNullOrThrow = (fieldName: string, rawValue: unknown, type: string, required: boolean, reason: string): Node => {
  if (required) {
    throw new ValidationError(fieldName, rawValue, type, reason);
  }
  return nodes.aConst({ isnull: true });
};

// type (int, text, etc)
// from Array of keys that map to records found (e.g., ['lon', 'lat'])
const getCoercionFunc = (type: string, from: string[], opts: FieldOptions, fieldName: string): CoercionFunc => {
  const parseFn = opts.parse || identity;
  const required = opts.required || false;

  switch (type) {
    case 'int':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(rawValue);
        if (isEmpty(value) || isNullToken(rawValue)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        if (!isNumeric(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is not numeric');
        }
        const val = nodes.aConst({
          ival: ast.integer({ ival: Number(value) })
        });
        return wrapValue(val, opts);
      };
    case 'float':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(rawValue);
        if (isEmpty(value) || isNullToken(rawValue)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        if (!isNumeric(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is not numeric');
        }

        const val = nodes.aConst({
          fval: ast.float({ fval: String(value) })
        });
        return wrapValue(val, opts);
      };
    case 'boolean':
    case 'bool':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(parseBoolean(rawValue));

        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is not a valid boolean');
        }

        // Use proper boolean constant for PG17 AST
        const val = nodes.aConst({
          boolval: ast.boolean({ boolval: Boolean(value) })
        });
        return wrapValue(val, opts);
      };
    case 'bbox':
      // do bbox magic with args from the fields
      return (record: Record<string, unknown>): Node => {
        const val = makeBoundingBox(String(parseFn(record[from[0]])));
        return wrapValue(val, opts);
      };
    case 'location':
      return (record: Record<string, unknown>): Node => {
        const [lon, lat] = getValuesFromKeys(record, from);
        if (lon === undefined || lon === null || isNullToken(lon)) {
          return makeNullOrThrow(fieldName, { lon, lat }, type, required, 'longitude is missing or null');
        }
        if (lat === undefined || lat === null || isNullToken(lat)) {
          return makeNullOrThrow(fieldName, { lon, lat }, type, required, 'latitude is missing or null');
        }
        if (!isNumeric(lon) || !isNumeric(lat)) {
          return makeNullOrThrow(fieldName, { lon, lat }, type, required, 'longitude or latitude is not numeric');
        }

        // NO parse here...
        const val = makeLocation(lon as string | number, lat as string | number);
        return wrapValue(val, opts);
      };
    case 'related':
      return (record: Record<string, unknown>): Node => {
        return getRelatedField({
          schema: opts.schema,
          table: opts.table!,
          refType: opts.refType!,
          refKey: opts.refKey!,
          refField: opts.refField!,
          wrap: opts.wrap,
          wrapAst: opts.wrapAst,
          cast: opts.cast,
          record,
          parse: parseFn,
          from
        });
      };
    case 'uuid':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        if (isNullToken(rawValue)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const value = parseFn(rawValue);
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty');
        }
        if (!/^([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i.test(String(value))) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is not a valid UUID');
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
    case 'uuid[]':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        if (isNullToken(rawValue)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        // Handle array values - validate each UUID
        if (Array.isArray(rawValue)) {
          if (rawValue.length === 0) {
            return makeNullOrThrow(fieldName, rawValue, type, required, 'array is empty');
          }
          const uuidRegex = /^([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i;
          for (const item of rawValue) {
            if (!uuidRegex.test(String(item))) {
              return makeNullOrThrow(fieldName, rawValue, type, required, `array contains invalid UUID: ${item}`);
            }
          }
          const arrayLiteral = psqlArray(rawValue);
          if (isEmpty(arrayLiteral)) {
            return makeNullOrThrow(fieldName, rawValue, type, required, 'failed to format array');
          }
          const val = nodes.aConst({
            sval: ast.string({ sval: String(arrayLiteral) })
          });
          return wrapValue(val, opts);
        }
        // If not an array, treat as empty/null
        return makeNullOrThrow(fieldName, rawValue, type, required, 'value is not an array');
      };
    case 'interval':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        if (isNullToken(rawValue)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const value = formatInterval(rawValue);
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or invalid interval');
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
    case 'timestamp':
    case 'timestamptz':
    case 'date':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        if (isNullToken(rawValue)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const value = parseFn(rawValue);
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty');
        }
        
        // Try to parse as a date to validate
        const strValue = String(value);
        const dateObj = new Date(strValue);
        
        // Check if the date is valid
        if (isNaN(dateObj.getTime())) {
          // Try parsing as epoch timestamp (seconds or milliseconds)
          const numValue = Number(strValue);
          if (!isNaN(numValue)) {
            // Assume milliseconds if > 10 billion, otherwise seconds
            const ms = numValue > 10000000000 ? numValue : numValue * 1000;
            const epochDate = new Date(ms);
            if (!isNaN(epochDate.getTime())) {
              const val = nodes.aConst({
                sval: ast.string({ sval: epochDate.toISOString() })
              });
              return wrapValue(val, opts);
            }
          }
          throw new Error(`Invalid ${type} value: "${strValue}" is not a valid date/timestamp`);
        }
        
        // Use ISO format for consistency
        const val = nodes.aConst({
          sval: ast.string({ sval: type === 'date' ? dateObj.toISOString().split('T')[0] : dateObj.toISOString() })
        });
        return wrapValue(val, opts);
      };
    case 'text':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(cleanseEmptyStrings(rawValue));
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };

    case 'text[]':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(psqlArray(cleanseEmptyStrings(rawValue)));
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
    case 'image':
    case 'attachment':
    case 'json':
    case 'jsonb':
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(parseJson(cleanseEmptyStrings(rawValue)));
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
    default:
      return (record: Record<string, unknown>): Node => {
        const rawValue = record[from[0]];
        const value = parseFn(cleanseEmptyStrings(rawValue));
        if (isEmpty(value)) {
          return makeNullOrThrow(fieldName, rawValue, type, required, 'value is empty or null');
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
  }
};

interface ConfigFields {
  [key: string]: string | FieldOptions;
}

interface Config {
  fields: ConfigFields;
}

interface TypesMap {
  [key: string]: CoercionFunc;
}

export const parseTypes = (config: Config): TypesMap => {
  return Object.entries(config.fields).reduce<TypesMap>((m, v) => {
    let [key, value] = v;
    let type: string;
    let from: string[];
    if (typeof value === 'string') {
      type = value;
      from = [key];
      if (['related', 'location'].includes(type)) {
        throw new Error('must use object for ' + type + ' type');
      }
      value = {
        type,
        from
      };
    } else {
      type = value.type!;
      from = getFromValue(value.from || key);
    }
    m[key] = getCoercionFunc(type, from, value, key);
    return m;
  }, {});
};
