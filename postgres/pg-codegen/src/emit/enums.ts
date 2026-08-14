/**
 * Emits one `enums.ts` module per schema: a literal tuple, a union type, and
 * lenient/strict runtime checkers for every PostgreSQL enum the schema's
 * tables reference.
 */
import { toConstantCase, toPascalCase } from 'inflekt';

import { IrEnum } from '../ir';
import { asConst, exportConst, generateCode, namedImport, t, withJsDoc } from './babel';

export const enumConstName = (enumName: string): string => toConstantCase(enumName);
export const enumTypeName = (enumName: string): string => toPascalCase(enumName);
export const enumAsName = (enumName: string): string => `as${toPascalCase(enumName)}`;
export const enumRequireName = (enumName: string): string => `require${toPascalCase(enumName)}`;

export const emitEnumsModule = (enums: IrEnum[]): string => {
  const statements: t.Statement[] = [namedImport(['asOneOf', 'requireOneOf'], '@constructive-io/coerce')];

  for (const irEnum of enums) {
    const constName = enumConstName(irEnum.name);
    const typeName = enumTypeName(irEnum.name);

    statements.push(
      withJsDoc(
        exportConst(
          constName,
          asConst(t.arrayExpression(irEnum.values.map(value => t.stringLiteral(value))))
        ),
        `Values of the \`${irEnum.schema}.${irEnum.name}\` enum.`
      )
    );

    statements.push(
      t.exportNamedDeclaration(
        t.tsTypeAliasDeclaration(
          t.identifier(typeName),
          null,
          t.tsIndexedAccessType(
            t.tsTypeQuery(t.identifier(constName)),
            t.tsNumberKeyword()
          )
        )
      )
    );

    const valueParam = t.identifier('value');
    valueParam.typeAnnotation = t.tsTypeAnnotation(t.tsUnknownKeyword());

    const asFn = t.arrowFunctionExpression(
      [valueParam],
      t.callExpression(t.identifier('asOneOf'), [t.identifier('value'), t.identifier(constName)])
    );
    asFn.returnType = t.tsTypeAnnotation(
      t.tsUnionType([t.tsTypeReference(t.identifier(typeName)), t.tsNullKeyword()])
    );
    statements.push(
      withJsDoc(
        exportConst(enumAsName(irEnum.name), asFn),
        `A \`${typeName}\`, else \`null\`.`
      )
    );

    const requireValueParam = t.identifier('value');
    requireValueParam.typeAnnotation = t.tsTypeAnnotation(t.tsUnknownKeyword());
    const labelParam = t.identifier('label');
    labelParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

    const requireFn = t.arrowFunctionExpression(
      [requireValueParam, labelParam],
      t.callExpression(t.identifier('requireOneOf'), [
        t.identifier('value'),
        t.identifier(constName),
        t.identifier('label')
      ])
    );
    requireFn.returnType = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(typeName)));
    statements.push(
      withJsDoc(
        exportConst(enumRequireName(irEnum.name), requireFn),
        `A \`${typeName}\`, throwing \`CoerceError\` when the value is not one of its members.`
      )
    );
  }

  return generateCode(statements);
};
