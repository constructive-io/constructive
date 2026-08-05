import { QuoteUtils } from '@pgsql/quotes';

const POSTGRES_IDENTIFIER_MAX_BYTES = 63;

/**
 * Quote a metadata-derived PostgreSQL identifier without accepting values that
 * PostgreSQL would truncate or that cannot be identifiers at all. Request data
 * must still be passed as query parameters.
 */
export const quoteSqlIdentifier = (
  identifier: string,
  label = 'SQL identifier'
): string => {
  if (
    typeof identifier !== 'string'
    || identifier.length === 0
    || identifier.includes('\0')
    || Buffer.byteLength(identifier, 'utf8') > POSTGRES_IDENTIFIER_MAX_BYTES
  ) {
    throw new Error(`Invalid ${label}`);
  }
  const quoted = QuoteUtils.quoteIdentifier(identifier);
  return quoted.startsWith('"') ? quoted : `"${quoted}"`;
};

export const quoteQualifiedSqlIdentifier = (
  schema: string,
  object: string,
  label = 'qualified SQL identifier'
): string =>
  `${quoteSqlIdentifier(schema, `${label} schema`)}.${quoteSqlIdentifier(object, `${label} object`)}`;
