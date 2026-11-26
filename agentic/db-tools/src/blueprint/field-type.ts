import type { FieldDefault, FieldType } from 'node-type-registry';

const SQL_KEYWORDS = new Set([
  'CURRENT_TIMESTAMP',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'LOCALTIME',
  'LOCALTIMESTAMP',
  'CURRENT_ROLE',
  'CURRENT_USER',
  'SESSION_USER',
  'USER',
  'CURRENT_CATALOG',
  'CURRENT_SCHEMA',
]);

export function fieldTypeToTypeName(t: unknown): string {
  if (t == null) return '';
  if (typeof t === 'string') return t;
  if (typeof t === 'object') {
    const obj = t as { name?: unknown; array_dimensions?: unknown };
    if (typeof obj.name === 'string') {
      const dims =
        typeof obj.array_dimensions === 'number' && obj.array_dimensions > 0
          ? obj.array_dimensions
          : 0;
      return obj.name + '[]'.repeat(dims);
    }
  }
  return '';
}

export function toFieldType(typeName: string): FieldType {
  const raw = (typeName ?? '').trim();
  let base = raw;
  let dims = 0;
  while (base.endsWith('[]')) {
    base = base.slice(0, -2);
    dims += 1;
  }
  base = base.trim();
  const result: FieldType = { name: base };
  if (dims > 0) result.array_dimensions = dims;
  return result;
}

function parseScalarLiteral(token: string): string | number | boolean | null {
  const t = token.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t.toLowerCase() === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

export function toFieldDefault(def?: string | number | boolean | null): FieldDefault | undefined {
  if (def === undefined || def === null) return undefined;
  // A number or a boolean is a constant, sent as the value it is.
  if (typeof def === 'number' || typeof def === 'boolean') return { value: def };
  const raw = String(def).trim();
  if (raw === '') return undefined;

  if (SQL_KEYWORDS.has(raw.toUpperCase())) {
    return { sql_keyword: raw.toUpperCase() };
  }

  const fnMatch = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*)\)$/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const argsRaw = fnMatch[2].trim();
    const result: FieldDefault = { function: fnName };
    if (argsRaw !== '') {
      const args = argsRaw.split(',').map((a) => parseScalarLiteral(a));
      if (args.length > 0) result.args = args;
    }
    return result;
  }

  if (raw === 'true') return { value: true };
  if (raw === 'false') return { value: false };
  if (/^-?\d+(\.\d+)?$/.test(raw)) return { value: Number(raw) };

  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    return { value: raw.slice(1, -1) };
  }

  return { value: raw };
}
