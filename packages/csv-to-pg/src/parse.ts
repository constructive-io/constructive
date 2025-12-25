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

function isNumeric(str: unknown): boolean {
  if (typeof str === 'number') return true;
  if (typeof str !== 'string') return false;
  return (
    !isNaN(str as unknown as number) &&
    !isNaN(parseFloat(str))
  );
}

const parseJson = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  return value ? JSON.stringify(value) : undefined;
};

const psqlArray = (value: unknown): string | undefined => {
  if (Array.isArray(value) && value.length) {
    return `{${value.map((v) => v)}}`;
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

const cleanseEmptyStrings = (str: unknown): unknown => {
  if (typeof str === 'string') {
    if (str.trim() === '') return null;
    return str;
  } else {
    return str;
  }
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
}

type CoercionFunc = (record: Record<string, unknown>) => Node;

// type (int, text, etc)
// from Array of keys that map to records found (e.g., ['lon', 'lat'])
const getCoercionFunc = (type: string, from: string[], opts: FieldOptions): CoercionFunc => {
  const parseFn = opts.parse || identity;

  switch (type) {
    case 'int':
      return (record: Record<string, unknown>): Node => {
        const value = parseFn(record[from[0]]);
        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
        }
        if (!isNumeric(value)) {
          return nodes.aConst({ isnull: true });
        }
        const val = nodes.aConst({
          ival: ast.integer({ ival: Number(value) })
        });
        return wrapValue(val, opts);
      };
    case 'float':
      return (record: Record<string, unknown>): Node => {
        const value = parseFn(record[from[0]]);
        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
        }
        if (!isNumeric(value)) {
          return nodes.aConst({ isnull: true });
        }

        const val = nodes.aConst({
          fval: ast.float({ fval: String(value) })
        });
        return wrapValue(val, opts);
      };
    case 'boolean':
    case 'bool':
      return (record: Record<string, unknown>): Node => {
        const value = parseFn(parseBoolean(record[from[0]]));

        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
        }

        const val = nodes.string({
          sval: value ? 'TRUE' : 'FALSE'
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
        if (typeof lon === 'undefined') {
          return nodes.aConst({ isnull: true });
        }
        if (typeof lat === 'undefined') {
          return nodes.aConst({ isnull: true });
        }
        if (!isNumeric(lon) || !isNumeric(lat)) {
          return nodes.aConst({ isnull: true });
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
        const value = parseFn(record[from[0]]);
        if (
          isEmpty(value) ||
          !/^([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i.test(
            String(value)
          )
        ) {
          return nodes.aConst({ isnull: true });
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
    case 'text':
      return (record: Record<string, unknown>): Node => {
        const value = parseFn(cleanseEmptyStrings(record[from[0]]));
        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };

    case 'text[]':
      return (record: Record<string, unknown>): Node => {
        const value = parseFn(psqlArray(cleanseEmptyStrings(record[from[0]])));
        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
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
        const value = parseFn(parseJson(cleanseEmptyStrings(record[from[0]])));
        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
        }
        const val = nodes.aConst({
          sval: ast.string({ sval: String(value) })
        });
        return wrapValue(val, opts);
      };
    default:
      return (record: Record<string, unknown>): Node => {
        const value = parseFn(cleanseEmptyStrings(record[from[0]]));
        if (isEmpty(value)) {
          return nodes.aConst({ isnull: true });
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
    m[key] = getCoercionFunc(type, from, value);
    return m;
  }, {});
};
