/**
 * Emits one module per table: the camelCase application interface, the
 * snake_case row interface, coerce-backed decoders for both, row/application
 * converters, a serializer for writes, and typed table metadata.
 */
import { toCamelCase, toConstantCase, toPascalCase } from 'inflekt';

import { IrColumn, IrTable } from '../ir';
import {
  asConst,
  exportConst,
  generateCode,
  labelTemplate,
  namedImport,
  t,
  withJsDoc
} from './babel';
import { enumAsName, enumRequireName, enumTypeName } from './enums';

interface CoercerPair {
  require: string;
  as: string;
  expectedArray: string;
}

const COERCERS: Record<string, CoercerPair> = {
  boolean: { require: 'requireBoolean', as: 'asBoolean', expectedArray: 'an array of booleans' },
  integer: { require: 'requireInteger', as: 'asInteger', expectedArray: 'an array of integers' },
  bigint: { require: 'requireNumericInteger', as: 'asNumericInteger', expectedArray: 'an array of integers' },
  number: { require: 'requireNumeric', as: 'asNumeric', expectedArray: 'an array of numbers' },
  string: { require: 'requireString', as: 'asString', expectedArray: 'an array of non-empty strings' },
  uuid: { require: 'requireUuid', as: 'asUuid', expectedArray: 'an array of UUIDs' },
  timestamp: { require: 'requireIsoString', as: 'asIsoString', expectedArray: 'an array of timestamps' },
  json: { require: 'requireJson', as: 'asJson', expectedArray: 'an array of JSON documents' }
};

const scalarTsType = (column: IrColumn): t.TSType => {
  switch (column.scalar) {
  case 'boolean':
    return t.tsBooleanKeyword();
  case 'integer':
  case 'bigint':
  case 'number':
    return t.tsNumberKeyword();
  case 'string':
  case 'uuid':
  case 'timestamp':
    return t.tsStringKeyword();
  case 'json':
    return t.tsUnionType([
      t.tsTypeReference(
        t.identifier('Record'),
        t.tsTypeParameterInstantiation([t.tsStringKeyword(), t.tsUnknownKeyword()])
      ),
      t.tsArrayType(t.tsUnknownKeyword())
    ]);
  case 'enum':
    return t.tsTypeReference(t.identifier(enumTypeName(column.enumName as string)));
  default:
    return t.tsUnknownKeyword();
  }
};

const columnTsType = (column: IrColumn): t.TSType => {
  let type = scalarTsType(column);
  if (column.isArray) type = t.tsArrayType(type);
  if (column.nullable && column.scalar !== 'unknown') {
    type = t.tsUnionType([type, t.tsNullKeyword()]);
  }
  return type;
};

const property = (name: string, type: t.TSType, comment?: string): t.TSPropertySignature => {
  const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? t.identifier(name) : t.stringLiteral(name);
  const prop = t.tsPropertySignature(key, t.tsTypeAnnotation(type));
  if (comment) t.addComment(prop, 'leading', `* ${comment} `, false);
  return prop;
};

const member = (object: string, key: string): t.Expression =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? t.memberExpression(t.identifier(object), t.identifier(key))
    : t.memberExpression(t.identifier(object), t.stringLiteral(key), true);

const objectKey = (name: string): t.Identifier | t.StringLiteral =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? t.identifier(name) : t.stringLiteral(name);

export interface RecordModuleUsage {
  coerceImports: Set<string>;
  enumImports: Set<string>;
}

const decodeExpression = (
  column: IrColumn,
  key: string,
  usage: RecordModuleUsage
): t.Expression => {
  const value = member('record', key);

  if (column.scalar === 'unknown') {
    // No runtime shape to assert; the value passes through typed `unknown`.
    return value;
  }

  if (column.scalar === 'enum') {
    const enumName = column.enumName as string;
    if (column.isArray) {
      const elementName = enumAsName(enumName);
      usage.enumImports.add(elementName);
      if (column.nullable) {
        usage.coerceImports.add('asArrayOf');
        return t.callExpression(t.identifier('asArrayOf'), [value, t.identifier(elementName)]);
      }
      usage.coerceImports.add('requireArrayOf');
      return t.callExpression(t.identifier('requireArrayOf'), [
        value,
        t.identifier(elementName),
        labelTemplate(key),
        t.stringLiteral(`an array of ${enumTypeName(enumName)} values`)
      ]);
    }
    const fnName = column.nullable ? enumAsName(enumName) : enumRequireName(enumName);
    usage.enumImports.add(fnName);
    return column.nullable
      ? t.callExpression(t.identifier(fnName), [value])
      : t.callExpression(t.identifier(fnName), [value, labelTemplate(key)]);
  }

  const coercer = COERCERS[column.scalar];

  if (column.isArray) {
    usage.coerceImports.add(coercer.as);
    if (column.nullable) {
      usage.coerceImports.add('asArrayOf');
      return t.callExpression(t.identifier('asArrayOf'), [value, t.identifier(coercer.as)]);
    }
    usage.coerceImports.add('requireArrayOf');
    return t.callExpression(t.identifier('requireArrayOf'), [
      value,
      t.identifier(coercer.as),
      labelTemplate(key),
      t.stringLiteral(coercer.expectedArray)
    ]);
  }

  const fnName = column.nullable ? coercer.as : coercer.require;
  usage.coerceImports.add(fnName);
  return column.nullable
    ? t.callExpression(t.identifier(fnName), [value])
    : t.callExpression(t.identifier(fnName), [value, labelTemplate(key)]);
};

const decoderFunction = (
  table: IrTable,
  fnName: string,
  returnTypeName: string,
  keyFor: (column: IrColumn) => string,
  usage: RecordModuleUsage
): t.ExportNamedDeclaration => {
  usage.coerceImports.add('requireRecord');

  const valueParam = t.identifier('value');
  valueParam.typeAnnotation = t.tsTypeAnnotation(t.tsUnknownKeyword());
  const labelParam = t.assignmentPattern(
    t.identifier('label'),
    t.stringLiteral(`${table.schema}.${table.name}`)
  );

  const recordDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('record'),
      t.callExpression(t.identifier('requireRecord'), [t.identifier('value'), t.identifier('label')])
    )
  ]);

  const resultObject = t.objectExpression(
    table.columns.map(column =>
      t.objectProperty(objectKey(keyFor(column)), decodeExpression(column, keyFor(column), usage))
    )
  );

  const fn = t.arrowFunctionExpression(
    [valueParam, labelParam],
    t.blockStatement([recordDecl, t.returnStatement(resultObject)])
  );
  fn.returnType = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(returnTypeName)));

  return exportConst(fnName, fn);
};

export const emitRecordModule = (table: IrTable): string => {
  const usage: RecordModuleUsage = { coerceImports: new Set(), enumImports: new Set() };
  const pascal = toPascalCase(table.name);
  const rowTypeName = `${pascal}Row`;
  const metadataName = `${toConstantCase(table.name)}_TABLE`;
  const qualified = `${table.schema}.${table.name}`;

  const statements: t.Statement[] = [];

  // Application (camelCase) interface.
  const appInterface = t.exportNamedDeclaration(
    t.tsInterfaceDeclaration(
      t.identifier(pascal),
      null,
      null,
      t.tsInterfaceBody(
        table.columns.map(column => property(column.propertyName, columnTsType(column), column.comment))
      )
    )
  );
  withJsDoc(appInterface, `\`${qualified}\` — application (camelCase) shape.${table.comment ? `\n *\n * ${table.comment}` : ''}`);
  statements.push(appInterface);

  // Database row (snake_case) interface.
  const rowInterface = t.exportNamedDeclaration(
    t.tsInterfaceDeclaration(
      t.identifier(rowTypeName),
      null,
      null,
      t.tsInterfaceBody(table.columns.map(column => property(column.name, columnTsType(column), column.comment)))
    )
  );
  withJsDoc(rowInterface, `\`${qualified}\` — database row (snake_case) shape.`);
  statements.push(rowInterface);

  // Table metadata.
  const metadata = exportConst(
    metadataName,
    asConst(
      t.objectExpression([
        t.objectProperty(t.identifier('schema'), t.stringLiteral(table.schema)),
        t.objectProperty(t.identifier('name'), t.stringLiteral(table.name)),
        t.objectProperty(t.identifier('qualifiedName'), t.stringLiteral(qualified)),
        t.objectProperty(
          t.identifier('columns'),
          t.arrayExpression(table.columns.map(column => t.stringLiteral(column.name)))
        ),
        t.objectProperty(
          t.identifier('primaryKey'),
          t.arrayExpression(table.primaryKey.map(name => t.stringLiteral(name)))
        ),
        t.objectProperty(
          t.identifier('columnByField'),
          t.objectExpression(
            table.columns.map(column =>
              t.objectProperty(objectKey(column.propertyName), t.stringLiteral(column.name))
            )
          )
        )
      ])
    )
  );
  withJsDoc(metadata, `Column metadata for \`${qualified}\`.`);
  statements.push(metadata);

  // Decoders.
  statements.push(
    withJsDoc(
      decoderFunction(table, `decode${pascal}`, pascal, column => column.propertyName, usage),
      `Decode an untrusted camelCase value (a wire envelope, a parsed body) into \`${pascal}\`.\n *\n * Throws \`CoerceError\` naming the offending field when a required column is\n * missing or of the wrong shape.`
    )
  );
  statements.push(
    withJsDoc(
      decoderFunction(table, `decode${pascal}Row`, rowTypeName, column => column.name, usage),
      `Decode an untrusted snake_case database row into \`${rowTypeName}\`.`
    )
  );

  // Row -> application converter.
  const rowParam = t.identifier('row');
  rowParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(rowTypeName)));
  const fromRowFn = t.arrowFunctionExpression(
    [rowParam],
    t.objectExpression(
      table.columns.map(column =>
        t.objectProperty(objectKey(column.propertyName), member('row', column.name))
      )
    )
  );
  fromRowFn.returnType = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(pascal)));
  const fromRowName = `${toCamelCase(table.name)}FromRow`;
  statements.push(
    withJsDoc(
      exportConst(fromRowName, fromRowFn),
      `Convert a decoded \`${rowTypeName}\` into the camelCase application shape.`
    )
  );

  // unknown row -> application decoder.
  const decodeFromRowValue = t.identifier('value');
  decodeFromRowValue.typeAnnotation = t.tsTypeAnnotation(t.tsUnknownKeyword());
  const decodeFromRowLabel = t.assignmentPattern(
    t.identifier('label'),
    t.stringLiteral(qualified)
  );
  const decodeFromRowFn = t.arrowFunctionExpression(
    [decodeFromRowValue, decodeFromRowLabel],
    t.callExpression(t.identifier(fromRowName), [
      t.callExpression(t.identifier(`decode${pascal}Row`), [t.identifier('value'), t.identifier('label')])
    ])
  );
  decodeFromRowFn.returnType = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(pascal)));
  statements.push(
    withJsDoc(
      exportConst(`decode${pascal}FromRow`, decodeFromRowFn),
      `Decode an untrusted snake_case database row straight to \`${pascal}\`.`
    )
  );

  // Serializer: Partial application shape -> Partial row shape.
  const patchParam = t.identifier('patch');
  patchParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([t.tsTypeReference(t.identifier(pascal))])
    )
  );
  const partialRowType = t.tsTypeReference(
    t.identifier('Partial'),
    t.tsTypeParameterInstantiation([t.tsTypeReference(t.identifier(rowTypeName))])
  );
  const rowDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      Object.assign(t.identifier('row'), {
        typeAnnotation: t.tsTypeAnnotation(partialRowType)
      }),
      t.objectExpression([])
    )
  ]);
  const assignments: t.Statement[] = table.columns.map(column =>
    t.ifStatement(
      t.binaryExpression('!==', member('patch', column.propertyName), t.identifier('undefined')),
      t.expressionStatement(
        t.assignmentExpression('=', member('row', column.name) as t.MemberExpression, member('patch', column.propertyName))
      )
    )
  );
  const serializeFn = t.arrowFunctionExpression(
    [patchParam],
    t.blockStatement([rowDecl, ...assignments, t.returnStatement(t.identifier('row'))])
  );
  serializeFn.returnType = t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([t.tsTypeReference(t.identifier(rowTypeName))])
    )
  );
  statements.push(
    withJsDoc(
      exportConst(`serialize${pascal}`, serializeFn),
      `Map a partial \`${pascal}\` onto snake_case column values for a parameterized\n * INSERT or UPDATE. Absent fields stay absent; \`null\` writes NULL.`
    )
  );

  // Imports, now that usage is known.
  const imports: t.Statement[] = [];
  if (usage.coerceImports.size > 0) {
    imports.push(namedImport([...usage.coerceImports].sort(), '@constructive-io/coerce'));
  }
  if (usage.enumImports.size > 0) {
    const typeImports = new Set(
      table.columns
        .filter(column => column.scalar === 'enum')
        .map(column => enumTypeName(column.enumName as string))
    );
    imports.push(namedImport([...usage.enumImports, ...typeImports].sort(), './enums'));
  }

  return generateCode([...imports, ...statements]);
};
