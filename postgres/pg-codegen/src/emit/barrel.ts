/** Emits the per-schema and root index modules. */
import { toCamelCase, toKebabCase } from 'inflekt';

import { IrSchema } from '../ir';
import { generateCode, t } from './babel';

/** File names the schema directory reserves for its own modules. */
const RESERVED_FILE_NAMES = new Set(['index', 'db', 'enums']);

export const tableFileName = (tableName: string): string => {
  const name = toKebabCase(tableName);
  return RESERVED_FILE_NAMES.has(name) ? `${name}-table` : name;
};

export const emitSchemaIndex = (schema: IrSchema): string => {
  const statements: t.Statement[] = [];
  if (schema.enums.length > 0) {
    statements.push(t.exportAllDeclaration(t.stringLiteral('./enums')));
  }
  for (const table of schema.tables) {
    statements.push(t.exportAllDeclaration(t.stringLiteral(`./${tableFileName(table.name)}`)));
  }
  statements.push(t.exportAllDeclaration(t.stringLiteral('./db')));
  return generateCode(statements);
};

export const emitRootIndex = (schemas: IrSchema[]): string => {
  const statements: t.Statement[] = schemas.map(schema =>
    t.exportNamedDeclaration(
      null,
      [t.exportNamespaceSpecifier(t.identifier(toCamelCase(schema.name)))],
      t.stringLiteral(`./${schema.name}`)
    )
  );
  // The client's own vocabulary — `Where`, `Data`, `SelectShape`, `OrderBy` —
  // so a consumer that names a filter or a write input states it over a
  // generated record instead of hand-writing the field list again.
  statements.push(t.exportAllDeclaration(t.stringLiteral('./client')));
  return generateCode(statements);
};
