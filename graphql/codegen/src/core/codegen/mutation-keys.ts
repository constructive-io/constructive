/**
 * Mutation key factory generator
 *
 * Generates centralized mutation keys for tracking in-flight mutations.
 * Useful for:
 * - Optimistic updates with rollback
 * - Mutation deduplication
 * - Tracking mutation state with useIsMutating
 */
import * as t from '@babel/types';

import type { EntityRelationship, QueryKeyConfig } from '../../types/config';
import type { CleanOperation, CleanTable } from '../../types/schema';
import {
  addJSDocComment,
  asConst,
  constArray,
  generateCode,
  typedParam,
} from './babel-ast';
import { getGeneratedFileHeader, getTableNames, lcFirst } from './utils';

export interface MutationKeyGeneratorOptions {
  tables: CleanTable[];
  customMutations: CleanOperation[];
  config: QueryKeyConfig;
}

export interface GeneratedMutationKeysFile {
  fileName: string;
  content: string;
}

/**
 * Generate mutation keys declaration for a single table entity
 */
function generateEntityMutationKeysDeclaration(
  table: CleanTable,
  relationships: Record<string, EntityRelationship>,
): t.ExportNamedDeclaration {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();
  const keysName = `${lcFirst(typeName)}MutationKeys`;

  const relationship = relationships[entityKey];

  const properties: t.ObjectProperty[] = [];

  // all property
  const allProp = t.objectProperty(
    t.identifier('all'),
    constArray([t.stringLiteral('mutation'), t.stringLiteral(entityKey)]),
  );
  addJSDocComment(allProp, [`All ${singularName} mutation keys`]);
  properties.push(allProp);

  // create property
  let createProp: t.ObjectProperty;
  if (relationship) {
    const fkParam = t.identifier(relationship.foreignKey);
    fkParam.optional = true;
    fkParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

    const arrowFn = t.arrowFunctionExpression(
      [fkParam],
      t.conditionalExpression(
        t.identifier(relationship.foreignKey),
        constArray([
          t.stringLiteral('mutation'),
          t.stringLiteral(entityKey),
          t.stringLiteral('create'),
          t.objectExpression([
            t.objectProperty(
              t.identifier(relationship.foreignKey),
              t.identifier(relationship.foreignKey),
              false,
              true,
            ),
          ]),
        ]),
        constArray([
          t.stringLiteral('mutation'),
          t.stringLiteral(entityKey),
          t.stringLiteral('create'),
        ]),
      ),
    );

    createProp = t.objectProperty(t.identifier('create'), arrowFn);
  } else {
    const arrowFn = t.arrowFunctionExpression(
      [],
      constArray([
        t.stringLiteral('mutation'),
        t.stringLiteral(entityKey),
        t.stringLiteral('create'),
      ]),
    );

    createProp = t.objectProperty(t.identifier('create'), arrowFn);
  }
  addJSDocComment(createProp, [`Create ${singularName} mutation key`]);
  properties.push(createProp);

  // update property
  const updateArrowFn = t.arrowFunctionExpression(
    [
      typedParam(
        'id',
        t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]),
      ),
    ],
    constArray([
      t.stringLiteral('mutation'),
      t.stringLiteral(entityKey),
      t.stringLiteral('update'),
      t.identifier('id'),
    ]),
  );
  const updateProp = t.objectProperty(t.identifier('update'), updateArrowFn);
  addJSDocComment(updateProp, [`Update ${singularName} mutation key`]);
  properties.push(updateProp);

  // delete property
  const deleteArrowFn = t.arrowFunctionExpression(
    [
      typedParam(
        'id',
        t.tsUnionType([t.tsStringKeyword(), t.tsNumberKeyword()]),
      ),
    ],
    constArray([
      t.stringLiteral('mutation'),
      t.stringLiteral(entityKey),
      t.stringLiteral('delete'),
      t.identifier('id'),
    ]),
  );
  const deleteProp = t.objectProperty(t.identifier('delete'), deleteArrowFn);
  addJSDocComment(deleteProp, [`Delete ${singularName} mutation key`]);
  properties.push(deleteProp);

  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(keysName),
        asConst(t.objectExpression(properties)),
      ),
    ]),
  );
}

/**
 * Generate custom mutation keys declaration
 */
function generateCustomMutationKeysDeclaration(
  operations: CleanOperation[],
): t.ExportNamedDeclaration | null {
  if (operations.length === 0) return null;

  const properties: t.ObjectProperty[] = [];

  for (const op of operations) {
    const hasArgs = op.args.length > 0;

    let prop: t.ObjectProperty;

    if (hasArgs) {
      const identifierParam = t.identifier('identifier');
      identifierParam.optional = true;
      identifierParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

      const arrowFn = t.arrowFunctionExpression(
        [identifierParam],
        t.conditionalExpression(
          t.identifier('identifier'),
          constArray([
            t.stringLiteral('mutation'),
            t.stringLiteral(op.name),
            t.identifier('identifier'),
          ]),
          constArray([t.stringLiteral('mutation'), t.stringLiteral(op.name)]),
        ),
      );

      prop = t.objectProperty(t.identifier(op.name), arrowFn);
    } else {
      const arrowFn = t.arrowFunctionExpression(
        [],
        constArray([t.stringLiteral('mutation'), t.stringLiteral(op.name)]),
      );

      prop = t.objectProperty(t.identifier(op.name), arrowFn);
    }

    addJSDocComment(prop, [`Mutation key for ${op.name}`]);
    properties.push(prop);
  }

  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('customMutationKeys'),
        asConst(t.objectExpression(properties)),
      ),
    ]),
  );
}

/**
 * Generate the unified mutation keys store declaration
 */
function generateUnifiedMutationStoreDeclaration(
  tables: CleanTable[],
  hasCustomMutations: boolean,
): t.ExportNamedDeclaration {
  const properties: t.ObjectProperty[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const keysName = `${lcFirst(typeName)}MutationKeys`;
    properties.push(
      t.objectProperty(t.identifier(lcFirst(typeName)), t.identifier(keysName)),
    );
  }

  if (hasCustomMutations) {
    properties.push(
      t.objectProperty(
        t.identifier('custom'),
        t.identifier('customMutationKeys'),
      ),
    );
  }

  const decl = t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('mutationKeys'),
        asConst(t.objectExpression(properties)),
      ),
    ]),
  );

  addJSDocComment(decl, [
    'Unified mutation key store',
    '',
    'Use this for tracking in-flight mutations with useIsMutating.',
    '',
    '@example',
    '```ts',
    "import { useIsMutating } from '@tanstack/react-query';",
    "import { mutationKeys } from './generated';",
    '',
    '// Check if any user mutations are in progress',
    'const isMutatingUser = useIsMutating({ mutationKey: mutationKeys.user.all });',
    '',
    '// Check if a specific user is being updated',
    'const isUpdating = useIsMutating({ mutationKey: mutationKeys.user.update(userId) });',
    '```',
  ]);

  return decl;
}

/**
 * Generate the complete mutation-keys.ts file
 */
export function generateMutationKeysFile(
  options: MutationKeyGeneratorOptions,
): GeneratedMutationKeysFile {
  const { tables, customMutations, config } = options;
  const { relationships } = config;

  const statements: t.Statement[] = [];

  // Generate entity mutation keys
  for (const table of tables) {
    statements.push(
      generateEntityMutationKeysDeclaration(table, relationships),
    );
  }

  // Generate custom mutation keys
  const mutationOperations = customMutations.filter(
    (op) => op.kind === 'mutation',
  );
  const customKeysDecl =
    generateCustomMutationKeysDeclaration(mutationOperations);
  if (customKeysDecl) {
    statements.push(customKeysDecl);
  }

  // Generate unified store
  statements.push(
    generateUnifiedMutationStoreDeclaration(
      tables,
      mutationOperations.length > 0,
    ),
  );

  // Generate code from AST
  const code = generateCode(statements);

  // Build final content with header and section comments
  const header = getGeneratedFileHeader('Centralized mutation key factory');
  const description = `// ============================================================================
// Mutation keys for tracking in-flight mutations
//
// Benefits:
// - Track mutation state with useIsMutating
// - Implement optimistic updates with proper rollback
// - Deduplicate identical mutations
// - Coordinate related mutations
// ============================================================================`;

  let content = `${header}

${description}

// ============================================================================
// Entity Mutation Keys
// ============================================================================

`;

  // Insert section comments into the generated code
  const codeLines = code.split('\n');
  let addedCustomSection = false;
  let addedUnifiedSection = false;

  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i];

    // Detect custom mutation keys section
    if (
      !addedCustomSection &&
      line.startsWith('export const customMutationKeys')
    ) {
      content += `
// ============================================================================
// Custom Mutation Keys
// ============================================================================

`;
      addedCustomSection = true;
    }

    // Detect unified store section
    if (!addedUnifiedSection && line.includes('* Unified mutation key store')) {
      content += `
// ============================================================================
// Unified Mutation Key Store
// ============================================================================

`;
      addedUnifiedSection = true;
    }

    content += line + '\n';
  }

  return {
    fileName: 'mutation-keys.ts',
    content,
  };
}
