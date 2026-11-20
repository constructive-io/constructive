// The values the CRUD smoke writes: one per type for a create, and one field
// to change for an update. Unique per run through `stamp`.

import type { LiveMetaField } from '../extensions/db-tools/live-meta';

export type ValueOptions = {
  /** Unique per run, so values on unique columns don't collide with earlier runs. */
  stamp: string;
  /** YYYY-MM-DD and an ISO instant for date and datetime columns. */
  today: string;
  now: string;
};

type ValueResult = { value: unknown } | null;

type TextKind = 'email' | 'url' | 'text';

const TEXT_TYPES = new Set(['String']);

function textKind(field: LiveMetaField): TextKind {
  const pgType = (field.type?.pgType ?? '').toLowerCase();
  if (pgType === 'email' || /email$/i.test(field.name)) return 'email';
  if (pgType === 'url' || pgType === 'origin' || /(url|website|homepage)$/i.test(field.name)) {
    return 'url';
  }
  return 'text';
}

function textValue(kind: TextKind, stamp: string, edited: boolean): string {
  const suffix = edited ? '-edited' : '';
  if (kind === 'email') return `smoke${suffix}+${stamp}@example.com`;
  if (kind === 'url') return `https://example.com/${stamp}${edited ? '/edited' : ''}`;
  return `Smoke ${stamp}${edited ? ' edited' : ''}`;
}

export const isEnum = (field: LiveMetaField) => (field.enumValues?.values?.length ?? 0) > 0;

function wrapArray(field: LiveMetaField, value: unknown): ValueResult {
  return { value: field.type?.isArray ? [value] : value };
}

/** A create value for the field's type: an enum's first value, else one per GraphQL type. */
export function scalarValue(field: LiveMetaField, options: ValueOptions): ValueResult {
  const enumValues = field.enumValues?.values ?? [];
  if (enumValues.length) return wrapArray(field, enumValues[0]);
  const gqlType = field.type?.gqlType ?? 'String';
  switch (gqlType) {
  case 'String':
    return wrapArray(field, textValue(textKind(field), options.stamp, false));
  case 'Boolean':
    return wrapArray(field, true);
  case 'Int':
    return wrapArray(field, 1);
  case 'BigInt':
    return wrapArray(field, '1');
  case 'Float':
    return wrapArray(field, 1.5);
  case 'BigFloat':
    return wrapArray(field, '1.5');
  case 'Date':
    return wrapArray(field, options.today);
  case 'Datetime':
    return wrapArray(field, options.now);
  case 'Time':
    return wrapArray(field, '12:00:00');
  case 'JSON':
    return { value: {} };
  default:
    return null;
  }
}

// One field to change: plain text first (usually the title), then any text,
// a flag, a number, or an enum with a second value to move to.
export function updateFor(
  fields: LiveMetaField[],
  options: ValueOptions,
): { field: string; value: unknown } | null {
  const editable = fields.filter((f) => !f.type?.isArray);
  const texts = editable.filter((f) => TEXT_TYPES.has(f.type?.gqlType ?? '') && !isEnum(f));
  const text = texts.find((f) => textKind(f) === 'text') ?? texts[0];
  if (text) return { field: text.name, value: textValue(textKind(text), options.stamp, true) };
  const flag = editable.find((f) => f.type?.gqlType === 'Boolean');
  if (flag) return { field: flag.name, value: false };
  const number = editable.find((f) => f.type?.gqlType === 'Int' || f.type?.gqlType === 'Float');
  if (number) return { field: number.name, value: 2 };
  const choice = editable.find((f) => (f.enumValues?.values?.length ?? 0) > 1);
  if (choice) return { field: choice.name, value: choice.enumValues?.values[1] };
  return null;
}
