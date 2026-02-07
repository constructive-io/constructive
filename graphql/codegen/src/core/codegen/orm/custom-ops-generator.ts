/**
 * Custom operations generator for ORM client (Babel AST-based)
 *
 * Generates db.query.* and db.mutation.* namespaces for non-table operations
 * like login, register, currentUser, etc.
 */
import * as t from '@babel/types';

import type { CleanArgument, CleanOperation, TypeRegistry } from '../../../types/schema';
import { asConst, generateCode } from '../babel-ast';
import { NON_SELECT_TYPES, getSelectTypeName } from '../select-helpers';
import {
  getTypeBaseName,
  isTypeRequired,
  typeRefToTsType
} from '../type-resolver';
import { getGeneratedFileHeader,ucFirst } from '../utils';

export interface GeneratedCustomOpsFile {
  fileName: string;
  content: string;
}

/**
 * Collect all input type names used by operations
 * Includes Input, Filter, OrderBy, and Condition types
 */
function collectInputTypeNamesFromOps(operations: CleanOperation[]): string[] {
  const inputTypes = new Set<string>();

  for (const op of operations) {
    for (const arg of op.args) {
      const baseName = getTypeBaseName(arg.type);
      if (
        baseName &&
        (baseName.endsWith('Input') ||
          baseName.endsWith('Filter') ||
          baseName.endsWith('OrderBy') ||
          baseName.endsWith('Condition'))
      ) {
        inputTypes.add(baseName);
      }
    }
  }

  return Array.from(inputTypes);
}

/**
 * Collect all payload/return type names from operations (for Select types)
 * Filters out scalar types
 */
function collectPayloadTypeNamesFromOps(
  operations: CleanOperation[]
): string[] {
  const payloadTypes = new Set<string>();

  for (const op of operations) {
    const baseName = getTypeBaseName(op.returnType);
    if (
      baseName &&
      !baseName.endsWith('Connection') &&
      !NON_SELECT_TYPES.has(baseName)
    ) {
      payloadTypes.add(baseName);
    }
  }

  return Array.from(payloadTypes);
}

/**
 * Collect Connection and other non-scalar return type names that need importing
 * (for typing QueryBuilder results on scalar/Connection operations)
 */
function collectRawReturnTypeNames(
  operations: CleanOperation[]
): string[] {
  const types = new Set<string>();

  for (const op of operations) {
    const baseName = getTypeBaseName(op.returnType);
    if (
      baseName &&
      !NON_SELECT_TYPES.has(baseName) &&
      baseName.endsWith('Connection')
    ) {
      types.add(baseName);
    }
  }

  return Array.from(types);
}

function createImportDeclaration(
  moduleSpecifier: string,
  namedImports: string[],
  typeOnly: boolean = false
): t.ImportDeclaration {
  const specifiers = namedImports.map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name))
  );
  const decl = t.importDeclaration(specifiers, t.stringLiteral(moduleSpecifier));
  decl.importKind = typeOnly ? 'type' : 'value';
  return decl;
}

function createVariablesInterface(
  op: CleanOperation
): t.ExportNamedDeclaration | null {
  if (op.args.length === 0) return null;

  const varTypeName = `${ucFirst(op.name)}Variables`;
  const props = op.args.map((arg) => {
    const optional = !isTypeRequired(arg.type);
    const prop = t.tsPropertySignature(
      t.identifier(arg.name),
      t.tsTypeAnnotation(parseTypeAnnotation(typeRefToTsType(arg.type)))
    );
    prop.optional = optional;
    return prop;
  });

  const interfaceDecl = t.tsInterfaceDeclaration(
    t.identifier(varTypeName),
    null,
    null,
    t.tsInterfaceBody(props)
  );
  return t.exportNamedDeclaration(interfaceDecl);
}

function parseTypeAnnotation(typeStr: string): t.TSType {
  if (typeStr === 'string') return t.tsStringKeyword();
  if (typeStr === 'number') return t.tsNumberKeyword();
  if (typeStr === 'boolean') return t.tsBooleanKeyword();
  if (typeStr === 'null') return t.tsNullKeyword();
  if (typeStr === 'undefined') return t.tsUndefinedKeyword();
  if (typeStr === 'unknown') return t.tsUnknownKeyword();

  if (typeStr.includes(' | ')) {
    const parts = typeStr.split(' | ').map((p) => parseTypeAnnotation(p.trim()));
    return t.tsUnionType(parts);
  }

  if (typeStr.endsWith('[]')) {
    return t.tsArrayType(parseTypeAnnotation(typeStr.slice(0, -2)));
  }

  return t.tsTypeReference(t.identifier(typeStr));
}

function buildSelectedResultTsType(
  typeRef: CleanArgument['type'],
  payloadTypeName: string
): t.TSType {
  if (typeRef.kind === 'NON_NULL' && typeRef.ofType) {
    return buildSelectedResultTsType(typeRef.ofType as CleanArgument['type'], payloadTypeName);
  }

  if (typeRef.kind === 'LIST' && typeRef.ofType) {
    return t.tsArrayType(
      buildSelectedResultTsType(typeRef.ofType as CleanArgument['type'], payloadTypeName)
    );
  }

  return t.tsTypeReference(
    t.identifier('InferSelectResult'),
    t.tsTypeParameterInstantiation([
      t.tsTypeReference(t.identifier(payloadTypeName)),
      t.tsTypeReference(t.identifier('S'))
    ])
  );
}

function buildDefaultSelectExpression(
  typeName: string,
  typeRegistry: TypeRegistry,
  depth: number = 0
): t.Expression {
  const resolved = typeRegistry.get(typeName);
  const fields = resolved?.fields ?? [];

  if (depth > 3 || fields.length === 0) {
    // Use first field if available, otherwise fallback to 'id'
    const fallbackName = fields.length > 0 ? fields[0].name : 'id';
    return t.objectExpression([t.objectProperty(t.identifier(fallbackName), t.booleanLiteral(true))]);
  }

  // Prefer id-like fields
  const idLike = fields.find((f) => f.name === 'id' || f.name === 'nodeId');
  if (idLike) {
    return t.objectExpression([
      t.objectProperty(t.identifier(idLike.name), t.booleanLiteral(true))
    ]);
  }

  // Prefer scalar/enum fields
  const scalarField = fields.find((f) => {
    const baseName = getTypeBaseName(f.type);
    if (!baseName) return false;
    if (NON_SELECT_TYPES.has(baseName)) return true;
    const baseResolved = typeRegistry.get(baseName);
    return baseResolved?.kind === 'ENUM';
  });

  if (scalarField) {
    return t.objectExpression([
      t.objectProperty(t.identifier(scalarField.name), t.booleanLiteral(true))
    ]);
  }

  // Fallback: first field (ensure valid selection for object fields)
  const first = fields[0];

  const firstBaseName = getTypeBaseName(first.type);
  if (!firstBaseName || NON_SELECT_TYPES.has(firstBaseName)) {
    return t.objectExpression([
      t.objectProperty(t.identifier(first.name), t.booleanLiteral(true))
    ]);
  }

  const nestedResolved = typeRegistry.get(firstBaseName);
  if (nestedResolved?.kind === 'ENUM') {
    return t.objectExpression([
      t.objectProperty(t.identifier(first.name), t.booleanLiteral(true))
    ]);
  }

  return t.objectExpression([
    t.objectProperty(
      t.identifier(first.name),
      t.objectExpression([
        t.objectProperty(
          t.identifier('select'),
          buildDefaultSelectExpression(firstBaseName, typeRegistry, depth + 1)
        )
      ])
    )
  ]);
}

function buildOperationMethod(
  op: CleanOperation,
  operationType: 'query' | 'mutation',
  defaultSelectIdent?: t.Identifier
): t.ObjectProperty {
  const hasArgs = op.args.length > 0;
  const varTypeName = `${ucFirst(op.name)}Variables`;
  const varDefs = op.args.map((arg) => ({
    name: arg.name,
    type: formatGraphQLType(arg.type)
  }));

  const selectTypeName = getSelectTypeName(op.returnType);
  const payloadTypeName = getTypeBaseName(op.returnType);

  // Build the arrow function parameters
  const params: t.Identifier[] = [];

  if (hasArgs) {
    const argsParam = t.identifier('args');
    argsParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier(varTypeName)));
    params.push(argsParam);
  }

  const optionsParam = t.identifier('options');
  optionsParam.optional = true;
  if (selectTypeName) {
    const selectProp = t.tsPropertySignature(
      t.identifier('select'),
      t.tsTypeAnnotation(t.tsTypeReference(t.identifier('S')))
    );
    selectProp.optional = false;
    optionsParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsIntersectionType([
        t.tsTypeLiteral([selectProp]),
        t.tsTypeReference(
          t.identifier('StrictSelect'),
          t.tsTypeParameterInstantiation([
            t.tsTypeReference(t.identifier('S')),
            t.tsTypeReference(t.identifier(selectTypeName))
          ])
        )
      ])
    );
  } else {
    optionsParam.typeAnnotation = t.tsTypeAnnotation(
      t.tsTypeLiteral([
        (() => {
          const prop = t.tsPropertySignature(
            t.identifier('select'),
            t.tsTypeAnnotation(
              t.tsTypeReference(
                t.identifier('Record'),
                t.tsTypeParameterInstantiation([t.tsStringKeyword(), t.tsUnknownKeyword()])
              )
            )
          );
          prop.optional = true;
          return prop;
        })()
      ])
    );
  }
  params.push(optionsParam);

  // Build the QueryBuilder call
  const selectExpr = defaultSelectIdent
    ? t.logicalExpression(
      '??',
      t.optionalMemberExpression(t.identifier('options'), t.identifier('select'), false, true),
      defaultSelectIdent
    )
    : t.optionalMemberExpression(t.identifier('options'), t.identifier('select'), false, true);
  const entityTypeExpr = selectTypeName && payloadTypeName
    ? t.stringLiteral(payloadTypeName)
    : t.identifier('undefined');

  const queryBuilderArgs = t.objectExpression([
    t.objectProperty(t.identifier('client'), t.identifier('client'), false, true),
    t.objectProperty(t.identifier('operation'), t.stringLiteral(operationType)),
    t.objectProperty(t.identifier('operationName'), t.stringLiteral(ucFirst(op.name))),
    t.objectProperty(t.identifier('fieldName'), t.stringLiteral(op.name)),
    t.spreadElement(
      t.callExpression(t.identifier('buildCustomDocument'), [
        t.stringLiteral(operationType),
        t.stringLiteral(ucFirst(op.name)),
        t.stringLiteral(op.name),
        selectExpr,
        hasArgs ? t.identifier('args') : t.identifier('undefined'),
        t.arrayExpression(
          varDefs.map((v) =>
            t.objectExpression([
              t.objectProperty(t.identifier('name'), t.stringLiteral(v.name)),
              t.objectProperty(t.identifier('type'), t.stringLiteral(v.type))
            ])
          )
        ),
        t.identifier('connectionFieldsMap'),
        entityTypeExpr
      ])
    )
  ]);

  const newExpr = t.newExpression(t.identifier('QueryBuilder'), [queryBuilderArgs]);

  // Add type parameter to QueryBuilder for typed .unwrap() results
  if (selectTypeName && payloadTypeName) {
    // Select-based type: use InferSelectResult<PayloadType, S>
    (newExpr as any).typeParameters = t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier(op.name),
          t.tsTypeAnnotation(
            buildSelectedResultTsType(op.returnType, payloadTypeName)
          )
        )
      ])
    ]);
  } else {
    // Scalar/Connection type: use raw TS type directly
    const rawTsType = typeRefToTsType(op.returnType);
    (newExpr as any).typeParameters = t.tsTypeParameterInstantiation([
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier(op.name),
          t.tsTypeAnnotation(parseTypeAnnotation(rawTsType))
        )
      ])
    ]);
  }

  const arrowFunc = t.arrowFunctionExpression(params, newExpr);

  // Add type parameters to arrow function if we have a select type
  if (selectTypeName) {
    const defaultType = defaultSelectIdent
      ? t.tsTypeQuery(defaultSelectIdent)
      : null;
    const typeParam = t.tsTypeParameter(
      t.tsTypeReference(t.identifier(selectTypeName)),
      defaultType,
      'S'
    );
    arrowFunc.typeParameters = t.tsTypeParameterDeclaration([typeParam]);
  }

  return t.objectProperty(t.identifier(op.name), arrowFunc);
}

/**
 * Generate the query/index.ts file for custom query operations
 */
export function generateCustomQueryOpsFile(
  operations: CleanOperation[],
  typeRegistry: TypeRegistry
): GeneratedCustomOpsFile {
  const statements: t.Statement[] = [];

  // Collect all input type names and payload type names
  const inputTypeNames = collectInputTypeNamesFromOps(operations);
  const payloadTypeNames = collectPayloadTypeNamesFromOps(operations);
  const selectTypeNames = payloadTypeNames.map((p) => `${p}Select`);
  const rawReturnTypeNames = collectRawReturnTypeNames(operations);
  const allTypeImports = [...new Set([...inputTypeNames, ...payloadTypeNames, ...selectTypeNames, ...rawReturnTypeNames])];

  // Add imports
  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(createImportDeclaration('../query-builder', ['QueryBuilder', 'buildCustomDocument']));
  statements.push(createImportDeclaration('../select-types', ['InferSelectResult', 'StrictSelect'], true));

  if (allTypeImports.length > 0) {
    statements.push(createImportDeclaration('../input-types', allTypeImports, true));
  }
  statements.push(createImportDeclaration('../input-types', ['connectionFieldsMap']));

  // Generate variable interfaces
  for (const op of operations) {
    const varInterface = createVariablesInterface(op);
    if (varInterface) statements.push(varInterface);
  }

  // Default selects (avoid invalid documents when select is omitted)
  const defaultSelectIdentsByOpName = new Map<string, t.Identifier>();
  for (const op of operations) {
    const selectTypeName = getSelectTypeName(op.returnType);
    const payloadTypeName = getTypeBaseName(op.returnType);
    if (!selectTypeName || !payloadTypeName) continue;

    const ident = t.identifier(`${op.name}DefaultSelect`);
    defaultSelectIdentsByOpName.set(op.name, ident);
    statements.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          ident,
          asConst(buildDefaultSelectExpression(payloadTypeName, typeRegistry))
        )
      ])
    );
  }

  // Generate factory function
  const operationProperties = operations.map((op) =>
    buildOperationMethod(op, 'query', defaultSelectIdentsByOpName.get(op.name))
  );

  const returnObj = t.objectExpression(operationProperties);
  const returnStmt = t.returnStatement(returnObj);

  const clientParam = t.identifier('client');
  clientParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('OrmClient')));

  const factoryFunc = t.functionDeclaration(
    t.identifier('createQueryOperations'),
    [clientParam],
    t.blockStatement([returnStmt])
  );
  statements.push(t.exportNamedDeclaration(factoryFunc));

  const header = getGeneratedFileHeader('Custom query operations');
  const code = generateCode(statements);

  return {
    fileName: 'query/index.ts',
    content: header + '\n' + code
  };
}

/**
 * Generate the mutation/index.ts file for custom mutation operations
 */
export function generateCustomMutationOpsFile(
  operations: CleanOperation[],
  typeRegistry: TypeRegistry
): GeneratedCustomOpsFile {
  const statements: t.Statement[] = [];

  // Collect all input type names and payload type names
  const inputTypeNames = collectInputTypeNamesFromOps(operations);
  const payloadTypeNames = collectPayloadTypeNamesFromOps(operations);
  const selectTypeNames = payloadTypeNames.map((p) => `${p}Select`);
  const rawReturnTypeNames = collectRawReturnTypeNames(operations);
  const allTypeImports = [...new Set([...inputTypeNames, ...payloadTypeNames, ...selectTypeNames, ...rawReturnTypeNames])];

  // Add imports
  statements.push(createImportDeclaration('../client', ['OrmClient']));
  statements.push(createImportDeclaration('../query-builder', ['QueryBuilder', 'buildCustomDocument']));
  statements.push(createImportDeclaration('../select-types', ['InferSelectResult', 'StrictSelect'], true));

  if (allTypeImports.length > 0) {
    statements.push(createImportDeclaration('../input-types', allTypeImports, true));
  }
  statements.push(createImportDeclaration('../input-types', ['connectionFieldsMap']));

  // Generate variable interfaces
  for (const op of operations) {
    const varInterface = createVariablesInterface(op);
    if (varInterface) statements.push(varInterface);
  }

  // Default selects (avoid invalid documents when select is omitted)
  const defaultSelectIdentsByOpName = new Map<string, t.Identifier>();
  for (const op of operations) {
    const selectTypeName = getSelectTypeName(op.returnType);
    const payloadTypeName = getTypeBaseName(op.returnType);
    if (!selectTypeName || !payloadTypeName) continue;

    const ident = t.identifier(`${op.name}DefaultSelect`);
    defaultSelectIdentsByOpName.set(op.name, ident);
    statements.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          ident,
          asConst(buildDefaultSelectExpression(payloadTypeName, typeRegistry))
        )
      ])
    );
  }

  // Generate factory function
  const operationProperties = operations.map((op) =>
    buildOperationMethod(op, 'mutation', defaultSelectIdentsByOpName.get(op.name))
  );

  const returnObj = t.objectExpression(operationProperties);
  const returnStmt = t.returnStatement(returnObj);

  const clientParam = t.identifier('client');
  clientParam.typeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('OrmClient')));

  const factoryFunc = t.functionDeclaration(
    t.identifier('createMutationOperations'),
    [clientParam],
    t.blockStatement([returnStmt])
  );
  statements.push(t.exportNamedDeclaration(factoryFunc));

  const header = getGeneratedFileHeader('Custom mutation operations');
  const code = generateCode(statements);

  return {
    fileName: 'mutation/index.ts',
    content: header + '\n' + code
  };
}

/**
 * Format a CleanTypeRef to GraphQL type string
 */
function formatGraphQLType(typeRef: CleanArgument['type']): string {
  let result = '';

  if (typeRef.kind === 'NON_NULL') {
    if (typeRef.ofType) {
      result = formatGraphQLType(typeRef.ofType as CleanArgument['type']) + '!';
    } else {
      result = (typeRef.name ?? 'String') + '!';
    }
  } else if (typeRef.kind === 'LIST') {
    if (typeRef.ofType) {
      result = `[${formatGraphQLType(typeRef.ofType as CleanArgument['type'])}]`;
    } else {
      result = '[String]';
    }
  } else {
    result = typeRef.name ?? 'String';
  }

  return result;
}
