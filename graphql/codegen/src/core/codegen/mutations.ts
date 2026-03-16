/**
 * Mutation hook generators - delegates to ORM model methods (Babel AST-based)
 *
 * Output structure:
 * mutations/
 *   useCreateCarMutation.ts  -> ORM create
 *   useUpdateCarMutation.ts  -> ORM update
 *   useDeleteCarMutation.ts  -> ORM delete
 */
import * as t from '@babel/types';

import type { CleanTable } from '../../types/schema';
import {
  addJSDocComment,
  buildSelectionArgsCall,
  callExpr,
  constDecl,
  createFunctionParam,
  createImportDeclaration,
  createSTypeParam,
  createTypeReExport,
  destructureParamsWithSelection,
  exportDeclareFunction,
  exportFunction,
  generateHookFileCode,
  getClientCallUnwrap,
  inferSelectResultType,
  objectProp,
  omitType,
  returnUseMutation,
  selectionConfigType,
  shorthandProp,
  spreadObj,
  sRef,
  typeRef,
  typeLiteralWithProps,
  useMutationOptionsType,
  useMutationResultType,
  voidStatement,
} from './hooks-ast';
import type { JunctionMutationMeta } from './junction-utils';
import { getJunctionHookName } from './junction-utils';
import {
  getCreateMutationFileName,
  getCreateMutationHookName,
  getCreateMutationName,
  getDeleteMutationFileName,
  getDeleteMutationHookName,
  getDeleteMutationName,
  getPrimaryKeyInfo,
  getTableNames,
  getUpdateMutationFileName,
  getUpdateMutationHookName,
  getUpdateMutationName,
  hasValidPrimaryKey,
  lcFirst,
} from './utils';

export interface GeneratedMutationFile {
  fileName: string;
  content: string;
}

export interface MutationGeneratorOptions {
  reactQueryEnabled?: boolean;
  useCentralizedKeys?: boolean;
}

function buildMutationResultType(
  mutationName: string,
  singularName: string,
  relationTypeName: string,
  selectType: t.TSType,
): t.TSTypeLiteral {
  return typeLiteralWithProps([
    {
      name: mutationName,
      type: typeLiteralWithProps([
        {
          name: singularName,
          type: inferSelectResultType(relationTypeName, selectType),
        },
      ]),
    },
  ]);
}

function buildFieldsSelectionType(
  s: t.TSType,
  selectTypeName: string,
): t.TSParenthesizedType {
  return t.tsParenthesizedType(
    t.tsIntersectionType([
      t.tsTypeLiteral([
        t.tsPropertySignature(
          t.identifier('fields'),
          t.tsTypeAnnotation(
            t.tsIntersectionType([s, typeRef(selectTypeName)]),
          ),
        ),
      ]),
      typeRef('HookStrictSelect', [
        typeRef('NoInfer', [s]),
        typeRef(selectTypeName),
      ]),
    ]),
  );
}

export function generateCreateMutationHook(
  table: CleanTable,
  options: MutationGeneratorOptions = {},
): GeneratedMutationFile | null {
  const { reactQueryEnabled = true, useCentralizedKeys = true } = options;

  if (!reactQueryEnabled) return null;

  const { typeName, singularName } = getTableNames(table);
  const hookName = getCreateMutationHookName(table);
  const mutationName = getCreateMutationName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const mutationKeysName = `${lcFirst(typeName)}MutationKeys`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const createInputTypeName = `Create${typeName}Input`;

  const statements: t.Statement[] = [];

  // Imports
  statements.push(
    createImportDeclaration('@tanstack/react-query', [
      'useMutation',
      'useQueryClient',
    ]),
  );
  statements.push(
    createImportDeclaration(
      '@tanstack/react-query',
      ['UseMutationOptions', 'UseMutationResult'],
      true,
    ),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration('../selection', ['buildSelectionArgs']),
  );
  statements.push(
    createImportDeclaration('../selection', ['SelectionConfig'], true),
  );

  if (useCentralizedKeys) {
    statements.push(createImportDeclaration('../query-keys', [keysName]));
    statements.push(
      createImportDeclaration('../mutation-keys', [mutationKeysName]),
    );
  }

  statements.push(
    createImportDeclaration(
      '../../orm/input-types',
      [selectTypeName, relationTypeName, createInputTypeName],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../../orm/select-types',
      ['InferSelectResult', 'HookStrictSelect'],
      true,
    ),
  );

  // Re-exports
  statements.push(
    createTypeReExport(
      [selectTypeName, relationTypeName, createInputTypeName],
      '../../orm/input-types',
    ),
  );

  // Variable type: CreateTypeName['singularName']
  const createVarType = t.tsIndexedAccessType(
    typeRef(createInputTypeName),
    t.tsLiteralType(t.stringLiteral(singularName)),
  );

  const resultType = (sel: t.TSType) =>
    buildMutationResultType(mutationName, singularName, relationTypeName, sel);

  // Overload 1: with fields
  const o1ParamType = t.tsIntersectionType([
    t.tsTypeLiteral([
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(buildFieldsSelectionType(sRef(), selectTypeName)),
      ),
    ]),
    useMutationOptionsType(resultType(sRef()), createVarType),
  ]);
  const o1 = exportDeclareFunction(
    hookName,
    createSTypeParam(selectTypeName),
    [createFunctionParam('params', o1ParamType)],
    useMutationResultType(resultType(sRef()), createVarType),
  );
  addJSDocComment(o1, [
    table.description || `Mutation hook for creating a ${typeName}`,
    '',
    '@example',
    '```tsx',
    `const { mutate, isPending } = ${hookName}({`,
    '  selection: { fields: { id: true, name: true } },',
    '});',
    '',
    "mutate({ name: 'New item' });",
    '```',
  ]);
  statements.push(o1);

  // Implementation
  const implSelProp = t.tsPropertySignature(
    t.identifier('selection'),
    t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName))),
  );
  const implParamType = t.tsIntersectionType([
    t.tsTypeLiteral([implSelProp]),
    omitType(
      typeRef('UseMutationOptions', [
        t.tsAnyKeyword(),
        typeRef('Error'),
        createVarType,
      ]),
      ['mutationFn'],
    ),
  ]);

  const body: t.Statement[] = [];
  body.push(buildSelectionArgsCall(selectTypeName));
  body.push(destructureParamsWithSelection('mutationOptions'));
  body.push(voidStatement('_selection'));
  body.push(constDecl('queryClient', callExpr('useQueryClient', [])));

  const mutationKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(
          t.identifier(mutationKeysName),
          t.identifier('create'),
        ),
        [],
      )
    : undefined;

  // mutationFn: (data: CreateInput['singular']) => getClient().singular.create({ data, select: ... }).unwrap()
  const dataParam = createFunctionParam('data', createVarType);
  const mutationFnExpr = t.arrowFunctionExpression(
    [dataParam],
    getClientCallUnwrap(
      singularName,
      'create',
      t.objectExpression([
        shorthandProp('data'),
        objectProp(
          'select',
          t.memberExpression(t.identifier('args'), t.identifier('select')),
        ),
      ]),
    ),
  );

  // onSuccess: invalidate lists
  const listKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(t.identifier(keysName), t.identifier('lists')),
        [],
      )
    : t.arrayExpression([
        t.stringLiteral(typeName.toLowerCase()),
        t.stringLiteral('list'),
      ]);

  const onSuccessFn = t.arrowFunctionExpression(
    [],
    t.blockStatement([
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([objectProp('queryKey', listKeyExpr)])],
        ),
      ),
    ]),
  );

  body.push(
    returnUseMutation(
      mutationFnExpr,
      [
        objectProp('onSuccess', onSuccessFn),
        spreadObj(t.identifier('mutationOptions')),
      ],
      mutationKeyExpr,
    ),
  );

  statements.push(
    exportFunction(
      hookName,
      null,
      [createFunctionParam('params', implParamType)],
      body,
    ),
  );

  return {
    fileName: getCreateMutationFileName(table),
    content: generateHookFileCode(
      table.description || `Create mutation hook for ${typeName}`,
      statements,
    ),
  };
}

export function generateUpdateMutationHook(
  table: CleanTable,
  options: MutationGeneratorOptions = {},
): GeneratedMutationFile | null {
  const { reactQueryEnabled = true, useCentralizedKeys = true } = options;

  if (!reactQueryEnabled) return null;
  if (table.query?.update === null) return null;
  if (!hasValidPrimaryKey(table)) return null;

  const { typeName, singularName } = getTableNames(table);
  const hookName = getUpdateMutationHookName(table);
  const mutationName = getUpdateMutationName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const mutationKeysName = `${lcFirst(typeName)}MutationKeys`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;
  const patchTypeName = `${typeName}Patch`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];
  const patchFieldName =
    table.query?.patchFieldName ?? lcFirst(typeName) + 'Patch';

  const pkTsType =
    pkField.tsType === 'string' ? t.tsStringKeyword() : t.tsNumberKeyword();

  const statements: t.Statement[] = [];

  // Imports
  statements.push(
    createImportDeclaration('@tanstack/react-query', [
      'useMutation',
      'useQueryClient',
    ]),
  );
  statements.push(
    createImportDeclaration(
      '@tanstack/react-query',
      ['UseMutationOptions', 'UseMutationResult'],
      true,
    ),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration('../selection', ['buildSelectionArgs']),
  );
  statements.push(
    createImportDeclaration('../selection', ['SelectionConfig'], true),
  );

  if (useCentralizedKeys) {
    statements.push(createImportDeclaration('../query-keys', [keysName]));
    statements.push(
      createImportDeclaration('../mutation-keys', [mutationKeysName]),
    );
  }

  statements.push(
    createImportDeclaration(
      '../../orm/input-types',
      [selectTypeName, relationTypeName, patchTypeName],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../../orm/select-types',
      ['InferSelectResult', 'HookStrictSelect'],
      true,
    ),
  );

  // Re-exports
  statements.push(
    createTypeReExport(
      [selectTypeName, relationTypeName, patchTypeName],
      '../../orm/input-types',
    ),
  );

  // Variable type: { pkField: type; patchFieldName: PatchType }
  const updateVarType = t.tsTypeLiteral([
    t.tsPropertySignature(
      t.identifier(pkField.name),
      t.tsTypeAnnotation(pkTsType),
    ),
    t.tsPropertySignature(
      t.identifier(patchFieldName),
      t.tsTypeAnnotation(typeRef(patchTypeName)),
    ),
  ]);

  const resultType = (sel: t.TSType) =>
    buildMutationResultType(mutationName, singularName, relationTypeName, sel);

  // Overload 1: with fields
  const o1ParamType = t.tsIntersectionType([
    t.tsTypeLiteral([
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(buildFieldsSelectionType(sRef(), selectTypeName)),
      ),
    ]),
    useMutationOptionsType(resultType(sRef()), updateVarType),
  ]);
  const o1 = exportDeclareFunction(
    hookName,
    createSTypeParam(selectTypeName),
    [createFunctionParam('params', o1ParamType)],
    useMutationResultType(resultType(sRef()), updateVarType),
  );
  addJSDocComment(o1, [
    table.description || `Mutation hook for updating a ${typeName}`,
    '',
    '@example',
    '```tsx',
    `const { mutate, isPending } = ${hookName}({`,
    '  selection: { fields: { id: true, name: true } },',
    '});',
    '',
    `mutate({ ${pkField.name}: 'value-here', ${patchFieldName}: { name: 'Updated' } });`,
    '```',
  ]);
  statements.push(o1);

  // Implementation
  const implSelProp = t.tsPropertySignature(
    t.identifier('selection'),
    t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName))),
  );
  const implParamType = t.tsIntersectionType([
    t.tsTypeLiteral([implSelProp]),
    omitType(
      typeRef('UseMutationOptions', [
        t.tsAnyKeyword(),
        typeRef('Error'),
        updateVarType,
      ]),
      ['mutationFn'],
    ),
  ]);

  const body: t.Statement[] = [];
  body.push(buildSelectionArgsCall(selectTypeName));
  body.push(destructureParamsWithSelection('mutationOptions'));
  body.push(voidStatement('_selection'));
  body.push(constDecl('queryClient', callExpr('useQueryClient', [])));

  const mutationKeyExpr = useCentralizedKeys
    ? t.memberExpression(t.identifier(mutationKeysName), t.identifier('all'))
    : undefined;

  // mutationFn: ({ pkField, patchFieldName }: VarType) =>
  //   getClient().singular.update({ where: { pkField }, data: patchFieldName, select: ... }).unwrap()
  const destructParam = t.objectPattern([
    shorthandProp(pkField.name),
    shorthandProp(patchFieldName),
  ]);
  destructParam.typeAnnotation = t.tsTypeAnnotation(updateVarType);
  const mutationFnExpr = t.arrowFunctionExpression(
    [destructParam],
    getClientCallUnwrap(
      singularName,
      'update',
      t.objectExpression([
        objectProp('where', t.objectExpression([shorthandProp(pkField.name)])),
        objectProp('data', t.identifier(patchFieldName)),
        objectProp(
          'select',
          t.memberExpression(t.identifier('args'), t.identifier('select')),
        ),
      ]),
    ),
  );

  // onSuccess: invalidate detail and lists
  const detailKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(t.identifier(keysName), t.identifier('detail')),
        [
          t.memberExpression(
            t.identifier('variables'),
            t.identifier(pkField.name),
          ),
        ],
      )
    : t.arrayExpression([
        t.stringLiteral(typeName.toLowerCase()),
        t.stringLiteral('detail'),
        t.memberExpression(
          t.identifier('variables'),
          t.identifier(pkField.name),
        ),
      ]);
  const listKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(t.identifier(keysName), t.identifier('lists')),
        [],
      )
    : t.arrayExpression([
        t.stringLiteral(typeName.toLowerCase()),
        t.stringLiteral('list'),
      ]);

  const onSuccessParam = t.identifier('_');
  const variablesParam = t.identifier('variables');
  const onSuccessFn = t.arrowFunctionExpression(
    [onSuccessParam, variablesParam],
    t.blockStatement([
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([objectProp('queryKey', detailKeyExpr)])],
        ),
      ),
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([objectProp('queryKey', listKeyExpr)])],
        ),
      ),
    ]),
  );

  body.push(
    returnUseMutation(
      mutationFnExpr,
      [
        objectProp('onSuccess', onSuccessFn),
        spreadObj(t.identifier('mutationOptions')),
      ],
      mutationKeyExpr,
    ),
  );

  statements.push(
    exportFunction(
      hookName,
      null,
      [createFunctionParam('params', implParamType)],
      body,
    ),
  );

  return {
    fileName: getUpdateMutationFileName(table),
    content: generateHookFileCode(
      table.description || `Update mutation hook for ${typeName}`,
      statements,
    ),
  };
}

export function generateDeleteMutationHook(
  table: CleanTable,
  options: MutationGeneratorOptions = {},
): GeneratedMutationFile | null {
  const { reactQueryEnabled = true, useCentralizedKeys = true } = options;

  if (!reactQueryEnabled) return null;
  if (table.query?.delete === null) return null;
  if (!hasValidPrimaryKey(table)) return null;

  const { typeName, singularName } = getTableNames(table);
  const hookName = getDeleteMutationHookName(table);
  const mutationName = getDeleteMutationName(table);
  const keysName = `${lcFirst(typeName)}Keys`;
  const mutationKeysName = `${lcFirst(typeName)}MutationKeys`;
  const selectTypeName = `${typeName}Select`;
  const relationTypeName = `${typeName}WithRelations`;

  const pkFields = getPrimaryKeyInfo(table);
  const pkField = pkFields[0];

  const pkTsType =
    pkField.tsType === 'string' ? t.tsStringKeyword() : t.tsNumberKeyword();

  const statements: t.Statement[] = [];

  // Imports
  statements.push(
    createImportDeclaration('@tanstack/react-query', [
      'useMutation',
      'useQueryClient',
    ]),
  );
  statements.push(
    createImportDeclaration(
      '@tanstack/react-query',
      ['UseMutationOptions', 'UseMutationResult'],
      true,
    ),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));
  statements.push(
    createImportDeclaration('../selection', ['buildSelectionArgs']),
  );
  statements.push(
    createImportDeclaration('../selection', ['SelectionConfig'], true),
  );

  if (useCentralizedKeys) {
    statements.push(createImportDeclaration('../query-keys', [keysName]));
    statements.push(
      createImportDeclaration('../mutation-keys', [mutationKeysName]),
    );
  }

  statements.push(
    createImportDeclaration(
      '../../orm/input-types',
      [selectTypeName, relationTypeName],
      true,
    ),
  );
  statements.push(
    createImportDeclaration(
      '../../orm/select-types',
      ['InferSelectResult', 'HookStrictSelect'],
      true,
    ),
  );

  // Re-exports
  statements.push(
    createTypeReExport(
      [selectTypeName, relationTypeName],
      '../../orm/input-types',
    ),
  );

  // Variable type: { pkField: type }
  const deleteVarType = t.tsTypeLiteral([
    t.tsPropertySignature(
      t.identifier(pkField.name),
      t.tsTypeAnnotation(pkTsType),
    ),
  ]);

  const resultType = (sel: t.TSType) =>
    buildMutationResultType(mutationName, singularName, relationTypeName, sel);

  // Overload 1: with fields
  const o1ParamType = t.tsIntersectionType([
    t.tsTypeLiteral([
      t.tsPropertySignature(
        t.identifier('selection'),
        t.tsTypeAnnotation(buildFieldsSelectionType(sRef(), selectTypeName)),
      ),
    ]),
    useMutationOptionsType(resultType(sRef()), deleteVarType),
  ]);
  const o1 = exportDeclareFunction(
    hookName,
    createSTypeParam(selectTypeName),
    [createFunctionParam('params', o1ParamType)],
    useMutationResultType(resultType(sRef()), deleteVarType),
  );
  addJSDocComment(o1, [
    table.description || `Mutation hook for deleting a ${typeName} with typed selection`,
    '',
    '@example',
    '```tsx',
    `const { mutate, isPending } = ${hookName}({`,
    '  selection: { fields: { id: true } },',
    '});',
    '',
    `mutate({ ${pkField.name}: ${pkField.tsType === 'string' ? "'value-to-delete'" : '123'} });`,
    '```',
  ]);
  statements.push(o1);

  // Implementation
  const implSelProp = t.tsPropertySignature(
    t.identifier('selection'),
    t.tsTypeAnnotation(selectionConfigType(typeRef(selectTypeName))),
  );
  const implParamType = t.tsIntersectionType([
    t.tsTypeLiteral([implSelProp]),
    omitType(
      typeRef('UseMutationOptions', [
        t.tsAnyKeyword(),
        typeRef('Error'),
        deleteVarType,
      ]),
      ['mutationFn'],
    ),
  ]);

  const body: t.Statement[] = [];
  body.push(buildSelectionArgsCall(selectTypeName));
  body.push(destructureParamsWithSelection('mutationOptions'));
  body.push(voidStatement('_selection'));
  body.push(constDecl('queryClient', callExpr('useQueryClient', [])));

  const mutationKeyExpr = useCentralizedKeys
    ? t.memberExpression(t.identifier(mutationKeysName), t.identifier('all'))
    : undefined;

  // mutationFn: ({ pkField }: { pkField: type }) =>
  //   getClient().singular.delete({ where: { pkField }, select: ... }).unwrap()
  const destructParam = t.objectPattern([shorthandProp(pkField.name)]);
  destructParam.typeAnnotation = t.tsTypeAnnotation(deleteVarType);
  const mutationFnExpr = t.arrowFunctionExpression(
    [destructParam],
    getClientCallUnwrap(
      singularName,
      'delete',
      t.objectExpression([
        objectProp('where', t.objectExpression([shorthandProp(pkField.name)])),
        objectProp(
          'select',
          t.memberExpression(t.identifier('args'), t.identifier('select')),
        ),
      ]),
    ),
  );

  // onSuccess: remove detail, invalidate lists
  const detailKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(t.identifier(keysName), t.identifier('detail')),
        [
          t.memberExpression(
            t.identifier('variables'),
            t.identifier(pkField.name),
          ),
        ],
      )
    : t.arrayExpression([
        t.stringLiteral(typeName.toLowerCase()),
        t.stringLiteral('detail'),
        t.memberExpression(
          t.identifier('variables'),
          t.identifier(pkField.name),
        ),
      ]);
  const listKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(t.identifier(keysName), t.identifier('lists')),
        [],
      )
    : t.arrayExpression([
        t.stringLiteral(typeName.toLowerCase()),
        t.stringLiteral('list'),
      ]);

  const onSuccessFn = t.arrowFunctionExpression(
    [t.identifier('_'), t.identifier('variables')],
    t.blockStatement([
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('removeQueries'),
          ),
          [t.objectExpression([objectProp('queryKey', detailKeyExpr)])],
        ),
      ),
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([objectProp('queryKey', listKeyExpr)])],
        ),
      ),
    ]),
  );

  body.push(
    returnUseMutation(
      mutationFnExpr,
      [
        objectProp('onSuccess', onSuccessFn),
        spreadObj(t.identifier('mutationOptions')),
      ],
      mutationKeyExpr,
    ),
  );

  statements.push(
    exportFunction(
      hookName,
      null,
      [createFunctionParam('params', implParamType)],
      body,
    ),
  );

  return {
    fileName: getDeleteMutationFileName(table),
    content: generateHookFileCode(
      table.description || `Delete mutation hook for ${typeName}`,
      statements,
    ),
  };
}

export function generateAllMutationHooks(
  tables: CleanTable[],
  options: MutationGeneratorOptions = {},
): GeneratedMutationFile[] {
  const files: GeneratedMutationFile[] = [];

  for (const table of tables) {
    const createHook = generateCreateMutationHook(table, options);
    if (createHook) {
      files.push(createHook);
    }

    const updateHook = generateUpdateMutationHook(table, options);
    if (updateHook) {
      files.push(updateHook);
    }

    const deleteHook = generateDeleteMutationHook(table, options);
    if (deleteHook) {
      files.push(deleteHook);
    }
  }

  return files;
}

// ============================================================================
// M:N Junction Mutation Hooks
// ============================================================================

/**
 * Generate a junction mutation hook (add or remove) for an M:N relationship.
 *
 * Generated hooks call the ORM model's addX/removeX method and invalidate
 * both sides of the relationship on success.
 */
export function generateJunctionMutationHook(
  jm: JunctionMutationMeta,
  kind: 'add' | 'remove',
  options: MutationGeneratorOptions = {},
): GeneratedMutationFile | null {
  const { reactQueryEnabled = true, useCentralizedKeys = true } = options;
  if (!reactQueryEnabled) return null;

  const { info } = jm;
  const leftNames = getTableNames(jm.leftTable);
  const rightNames = getTableNames(jm.rightTable);

  const methodName = kind === 'add' ? info.addMethodName : info.removeMethodName;
  const hookName = getJunctionHookName(jm, kind);
  const fileName = `${hookName}.ts`;

  const leftKeysName = `${lcFirst(leftNames.typeName)}Keys`;
  const rightKeysName = `${lcFirst(rightNames.typeName)}Keys`;
  const mutationKeysName = `${lcFirst(leftNames.typeName)}MutationKeys`;

  const mutationFieldName = kind === 'add' ? info.junctionCreateMutation : info.junctionDeleteMutation;

  // FK field types
  const leftTsType = info.leftFkField.tsType === 'string' ? t.tsStringKeyword() : t.tsNumberKeyword();
  const rightTsType = info.rightFkField.tsType === 'string' ? t.tsStringKeyword() : t.tsNumberKeyword();

  // Variable type: { leftFk: type; rightFk: type }
  const varType = t.tsTypeLiteral([
    t.tsPropertySignature(
      t.identifier(info.leftFkField.name),
      t.tsTypeAnnotation(leftTsType),
    ),
    t.tsPropertySignature(
      t.identifier(info.rightFkField.name),
      t.tsTypeAnnotation(rightTsType),
    ),
  ]);

  // Result type: { createPostTag: { postTag: PostTag } } or { deletePostTag: { postTag: PostTag } }
  const resultType = typeLiteralWithProps([{
    name: mutationFieldName,
    type: typeLiteralWithProps([{
      name: info.junctionSingularName,
      type: typeRef(info.junctionTypeName),
    }]),
  }]);

  const statements: t.Statement[] = [];

  // Imports
  statements.push(
    createImportDeclaration('@tanstack/react-query', [
      'useMutation',
      'useQueryClient',
    ]),
  );
  statements.push(
    createImportDeclaration(
      '@tanstack/react-query',
      ['UseMutationOptions'],
      true,
    ),
  );
  statements.push(createImportDeclaration('../client', ['getClient']));

  if (useCentralizedKeys) {
    // Import both left and right keys (may be same import source)
    const keyImports = [leftKeysName];
    if (rightKeysName !== leftKeysName) {
      keyImports.push(rightKeysName);
    }
    statements.push(createImportDeclaration('../query-keys', keyImports));
    statements.push(
      createImportDeclaration('../mutation-keys', [mutationKeysName]),
    );
  }

  statements.push(
    createImportDeclaration(
      '../../orm/input-types',
      [info.junctionTypeName],
      true,
    ),
  );

  // mutationFn: ({ leftFk, rightFk }) => getClient().left.addTag(leftFk, rightFk).unwrap()
  const destructParam = t.objectPattern([
    shorthandProp(info.leftFkField.name),
    shorthandProp(info.rightFkField.name),
  ]);
  destructParam.typeAnnotation = t.tsTypeAnnotation(varType);

  const clientCallExpr = t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(
          t.memberExpression(
            callExpr('getClient', []),
            t.identifier(leftNames.singularName),
          ),
          t.identifier(methodName),
        ),
        [
          t.identifier(info.leftFkField.name),
          t.identifier(info.rightFkField.name),
        ],
      ),
      t.identifier('unwrap'),
    ),
    [],
  );

  const mutationFnExpr = t.arrowFunctionExpression(
    [destructParam],
    clientCallExpr,
  );

  // onSuccess: bidirectional invalidation
  const onSuccessStatements: t.Statement[] = [];

  if (useCentralizedKeys) {
    // Invalidate left entity detail (its relations changed)
    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([
            objectProp('queryKey', callExpr(
              t.memberExpression(t.identifier(leftKeysName), t.identifier('detail')),
              [t.memberExpression(t.identifier('variables'), t.identifier(info.leftFkField.name))],
            )),
          ])],
        ),
      ),
    );

    // Invalidate left entity lists
    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([
            objectProp('queryKey', callExpr(
              t.memberExpression(t.identifier(leftKeysName), t.identifier('lists')),
              [],
            )),
          ])],
        ),
      ),
    );

    // Invalidate right entity detail (its relations changed)
    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([
            objectProp('queryKey', callExpr(
              t.memberExpression(t.identifier(rightKeysName), t.identifier('detail')),
              [t.memberExpression(t.identifier('variables'), t.identifier(info.rightFkField.name))],
            )),
          ])],
        ),
      ),
    );

    // Invalidate right entity lists
    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(
            t.identifier('queryClient'),
            t.identifier('invalidateQueries'),
          ),
          [t.objectExpression([
            objectProp('queryKey', callExpr(
              t.memberExpression(t.identifier(rightKeysName), t.identifier('lists')),
              [],
            )),
          ])],
        ),
      ),
    );
  } else {
    // Fallback: raw key arrays
    const leftKey = leftNames.typeName.toLowerCase();
    const rightKey = rightNames.typeName.toLowerCase();

    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(t.identifier('queryClient'), t.identifier('invalidateQueries')),
          [t.objectExpression([
            objectProp('queryKey', t.arrayExpression([
              t.stringLiteral(leftKey),
              t.stringLiteral('detail'),
              t.memberExpression(t.identifier('variables'), t.identifier(info.leftFkField.name)),
            ])),
          ])],
        ),
      ),
    );

    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(t.identifier('queryClient'), t.identifier('invalidateQueries')),
          [t.objectExpression([
            objectProp('queryKey', t.arrayExpression([
              t.stringLiteral(leftKey), t.stringLiteral('list'),
            ])),
          ])],
        ),
      ),
    );

    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(t.identifier('queryClient'), t.identifier('invalidateQueries')),
          [t.objectExpression([
            objectProp('queryKey', t.arrayExpression([
              t.stringLiteral(rightKey),
              t.stringLiteral('detail'),
              t.memberExpression(t.identifier('variables'), t.identifier(info.rightFkField.name)),
            ])),
          ])],
        ),
      ),
    );

    onSuccessStatements.push(
      t.expressionStatement(
        callExpr(
          t.memberExpression(t.identifier('queryClient'), t.identifier('invalidateQueries')),
          [t.objectExpression([
            objectProp('queryKey', t.arrayExpression([
              t.stringLiteral(rightKey), t.stringLiteral('list'),
            ])),
          ])],
        ),
      ),
    );
  }

  const onSuccessFn = t.arrowFunctionExpression(
    [t.identifier('_'), t.identifier('variables')],
    t.blockStatement(onSuccessStatements),
  );

  // Build the mutation options parameter type
  const mutationOptionsType = omitType(
    typeRef('UseMutationOptions', [resultType, typeRef('Error'), varType]),
    ['mutationFn'],
  );

  const mutationOptionsParam = createFunctionParam(
    'mutationOptions',
    mutationOptionsType,
    true,
  );

  // Function body
  const body: t.Statement[] = [];
  body.push(constDecl('queryClient', callExpr('useQueryClient', [])));

  const mutationKeyExpr = useCentralizedKeys
    ? callExpr(
        t.memberExpression(
          t.identifier(mutationKeysName),
          t.identifier(methodName),
        ),
        [],
      )
    : undefined;

  body.push(
    returnUseMutation(
      mutationFnExpr,
      [
        objectProp('onSuccess', onSuccessFn),
        spreadObj(t.identifier('mutationOptions')),
      ],
      mutationKeyExpr,
    ),
  );

  // Build the function
  const func = exportFunction(
    hookName,
    null,
    [mutationOptionsParam],
    body,
  );

  addJSDocComment(func, [
    `Junction mutation hook: ${kind} ${rightNames.singularName} ${kind === 'add' ? 'to' : 'from'} ${leftNames.singularName}`,
    '',
    `Calls \`getClient().${leftNames.singularName}.${methodName}()\` and invalidates both sides.`,
    '',
    '@example',
    '```tsx',
    `const { mutate } = ${hookName}();`,
    `mutate({ ${info.leftFkField.name}: '...', ${info.rightFkField.name}: '...' });`,
    '```',
  ]);

  statements.push(func);

  return {
    fileName,
    content: generateHookFileCode(
      `Junction mutation hook: ${leftNames.typeName}.${methodName}`,
      statements,
    ),
  };
}

/**
 * Generate all junction mutation hooks for all M:N relationships.
 */
export function generateAllJunctionMutationHooks(
  junctionMutations: JunctionMutationMeta[],
  options: MutationGeneratorOptions = {},
): GeneratedMutationFile[] {
  const files: GeneratedMutationFile[] = [];

  for (const jm of junctionMutations) {
    const addHook = generateJunctionMutationHook(jm, 'add', options);
    if (addHook) files.push(addHook);

    const removeHook = generateJunctionMutationHook(jm, 'remove', options);
    if (removeHook) files.push(removeHook);
  }

  return files;
}
