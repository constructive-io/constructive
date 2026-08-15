/** Emits the per-schema and root index modules. */
import { toCamelCase, toKebabCase } from 'inflekt';

import { IrSchema } from '../ir';
import { generateCode, t } from './babel';

export const tableFileName = (tableName: string): string => toKebabCase(tableName);

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
  return generateCode(statements);
};
