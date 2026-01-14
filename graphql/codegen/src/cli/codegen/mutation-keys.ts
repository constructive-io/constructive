/**
 * Mutation key factory generator
 *
 * Generates centralized mutation keys for tracking in-flight mutations.
 * Useful for:
 * - Optimistic updates with rollback
 * - Mutation deduplication
 * - Tracking mutation state with useIsMutating
 */
import type { CleanTable, CleanOperation } from '../../types/schema';
import type { ResolvedQueryKeyConfig, EntityRelationship } from '../../types/config';
import { getTableNames, getGeneratedFileHeader, lcFirst } from './utils';
import {
  t,
  generateCode,
  addJSDocComment,
  asConst,
  constArray,
  arrow,
  objectProp,
  exportConst,
  typedParam,
  stringOrNumberType,
  ternary,
  shorthandObject,
} from './babel-ast';

export interface MutationKeyGeneratorOptions {
  tables: CleanTable[];
  customMutations: CleanOperation[];
  config: ResolvedQueryKeyConfig;
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
  relationships: Record<string, EntityRelationship>
): t.ExportNamedDeclaration {
  const { typeName, singularName } = getTableNames(table);
  const entityKey = typeName.toLowerCase();
  const keysName = `${lcFirst(typeName)}MutationKeys`;

  const relationship = relationships[entityKey];

  const properties: t.ObjectProperty[] = [];

  // all property
  const allProp = objectProp(
    'all',
    constArray([t.stringLiteral('mutation'), t.stringLiteral(entityKey)])
  );
  addJSDocComment(allProp, [`All ${singularName} mutation keys`]);
  properties.push(allProp);

  // create property
  let createProp: t.ObjectProperty;
  if (relationship) {
    const fkParam = t.identifier(relationship.foreignKey);
    fkParam.optional = true;
    fkParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());

    createProp = objectProp(
      'create',
      arrow(
        [fkParam],
        ternary(
          t.identifier(relationship.foreignKey),
          constArray([
            t.stringLiteral('mutation'),
            t.stringLiteral(entityKey),
            t.stringLiteral('create'),
            shorthandObject(relationship.foreignKey),
          ]),
          constArray([
            t.stringLiteral('mutation'),
            t.stringLiteral(entityKey),
            t.stringLiteral('create'),
          ])
        )
      )
    );
  } else {
    createProp = objectProp(
      'create',
      arrow(
        [],
        constArray([
          t.stringLiteral('mutation'),
          t.stringLiteral(entityKey),
          t.stringLiteral('create'),
        ])
      )
    );
  }
  addJSDocComment(createProp, [`Create ${singularName} mutation key`]);
  properties.push(createProp);

  // update property
  const updateProp = objectProp(
    'update',
    arrow(
      [typedParam('id', stringOrNumberType())],
      constArray([
        t.stringLiteral('mutation'),
        t.stringLiteral(entityKey),
        t.stringLiteral('update'),
        t.identifier('id'),
      ])
    )
  );
  addJSDocComment(updateProp, [`Update ${singularName} mutation key`]);
  properties.push(updateProp);

  // delete property
  const deleteProp = objectProp(
    'delete',
    arrow(
      [typedParam('id', stringOrNumberType())],
      constArray([
        t.stringLiteral('mutation'),
        t.stringLiteral(entityKey),
        t.stringLiteral('delete'),
        t.identifier('id'),
      ])
    )
  );
  addJSDocComment(deleteProp, [`Delete ${singularName} mutation key`]);
  properties.push(deleteProp);

  return exportConst(keysName, asConst(t.objectExpression(properties)));
}

/**
 * Generate custom mutation keys declaration
 */
function generateCustomMutationKeysDeclaration(
  operations: CleanOperation[]
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

      prop = objectProp(
        op.name,
        arrow(
          [identifierParam],
          ternary(
            t.identifier('identifier'),
            constArray([
              t.stringLiteral('mutation'),
              t.stringLiteral(op.name),
              t.identifier('identifier'),
            ]),
            constArray([t.stringLiteral('mutation'), t.stringLiteral(op.name)])
          )
        )
      );
    } else {
      prop = objectProp(
        op.name,
        arrow([], constArray([t.stringLiteral('mutation'), t.stringLiteral(op.name)]))
      );
    }

    addJSDocComment(prop, [`Mutation key for ${op.name}`]);
    properties.push(prop);
  }

  return exportConst('customMutationKeys', asConst(t.objectExpression(properties)));
}

/**
 * Generate the unified mutation keys store declaration
 */
function generateUnifiedMutationStoreDeclaration(
  tables: CleanTable[],
  hasCustomMutations: boolean
): t.ExportNamedDeclaration {
  const properties: t.ObjectProperty[] = [];

  for (const table of tables) {
    const { typeName } = getTableNames(table);
    const keysName = `${lcFirst(typeName)}MutationKeys`;
    properties.push(
      t.objectProperty(t.identifier(lcFirst(typeName)), t.identifier(keysName))
    );
  }

  if (hasCustomMutations) {
    properties.push(
      t.objectProperty(t.identifier('custom'), t.identifier('customMutationKeys'))
    );
  }

  const decl = exportConst('mutationKeys', asConst(t.objectExpression(properties)));

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
  options: MutationKeyGeneratorOptions
): GeneratedMutationKeysFile {
  const { tables, customMutations, config } = options;
  const { relationships } = config;

  const statements: t.Statement[] = [];

  // Generate entity mutation keys
  for (const table of tables) {
    statements.push(generateEntityMutationKeysDeclaration(table, relationships));
  }

  // Generate custom mutation keys
  const mutationOperations = customMutations.filter((op) => op.kind === 'mutation');
  const customKeysDecl = generateCustomMutationKeysDeclaration(mutationOperations);
  if (customKeysDecl) {
    statements.push(customKeysDecl);
  }

  // Generate unified store
  statements.push(generateUnifiedMutationStoreDeclaration(tables, mutationOperations.length > 0));

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
    if (!addedCustomSection && line.startsWith('export const customMutationKeys')) {
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
