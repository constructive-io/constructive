import * as t from '@babel/types';
import { toKebabCase } from 'komoji';

import { generateCode } from '../babel-ast';
import {
  getGeneratedFileHeader,
  getPrimaryKeyInfo,
  getScalarFields,
  getSelectableScalarFields,
  getTableNames,
  getWritableFieldNames,
  resolveInnerInputType,
  ucFirst,
  lcFirst,
  toPascalCase,
  getCreateInputTypeName,
  getPatchTypeName,
} from '../utils';
import type { Table, TypeRegistry } from '../../../types/schema';
import type { GeneratedFile } from './executor-generator';
import { categorizeSpecialFields } from '../docs-utils';
import type { SpecialFieldGroup } from '../docs-utils';

function createImportDeclaration(
  moduleSpecifier: string,
  namedImports: string[],
  typeOnly: boolean = false,
): t.ImportDeclaration {
  const specifiers = namedImports.map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name)),
  );
  const decl = t.importDeclaration(
    specifiers,
    t.stringLiteral(moduleSpecifier),
  );
  decl.importKind = typeOnly ? 'type' : 'value';
  return decl;
}

/**
 * Build a field schema object that maps field names to their GraphQL types.
 * This is used at runtime for type coercion (string CLI args → proper types).
 * e.g., { name: 'string', isActive: 'boolean', position: 'int', status: 'enum' }
 */
/**
 * Returns a t.TSType node for the appropriate TypeScript type assertion
 * based on a field's GraphQL type. Used to cast `cleanedData.fieldName`
 * to the correct type expected by the ORM.
 */
/**
 * Known GraphQL scalar types. Anything not in this set is an enum or custom type.
 */
const KNOWN_SCALARS = new Set([
  'String', 'Boolean', 'Int', 'BigInt', 'Float', 'UUID',
  'JSON', 'GeoJSON', 'Datetime', 'Date', 'Time', 'Cursor',
  'BigFloat', 'Interval',
]);

/**
 * Returns true if the GraphQL type is a known scalar.
 * Non-scalar types (enums, custom input types) need different handling.
 */
function isKnownScalar(gqlType: string): boolean {
  return KNOWN_SCALARS.has(gqlType.replace(/!/g, ''));
}

function getTsTypeForField(field: { type: { gqlType: string; isArray: boolean } }): t.TSType | null {
  const gqlType = field.type.gqlType.replace(/!/g, '');

  // For non-scalar types (enums, custom types), return null to signal
  // that no type assertion should be emitted — the value will be passed
  // without casting, which avoids "string is not assignable to EnumType" errors.
  if (!isKnownScalar(gqlType)) {
    return null;
  }

  // Determine the base scalar type
  // Note: ORM input types flatten array fields to their scalar base type
  // (e.g., _uuid[] in PG -> string in the ORM input), so we do NOT wrap
  // in tsArrayType here.
  switch (gqlType) {
    case 'Boolean':
      return t.tsBooleanKeyword();
    case 'Int':
    case 'BigInt':
    case 'Float':
    case 'BigFloat':
      return t.tsNumberKeyword();
    case 'JSON':
    case 'GeoJSON':
      return t.tsTypeReference(
        t.identifier('Record'),
        t.tsTypeParameterInstantiation([
          t.tsStringKeyword(),
          t.tsUnknownKeyword(),
        ]),
      );
    case 'Interval':
      // IntervalInput is a complex type, skip assertion
      return null;
    case 'UUID':
    default:
      return t.tsStringKeyword();
  }
}

/**
 * Maps a GraphQL scalar type to the appropriate inquirerer question type.
 * Used by table CRUD commands to generate semantic prompts.
 */
function getQuestionTypeForField(field: { type: { gqlType: string } }): string {
  const gqlType = field.type.gqlType.replace(/!/g, '');
  switch (gqlType) {
    case 'Boolean':
      return 'boolean';
    case 'JSON':
    case 'GeoJSON':
      return 'json';
    default:
      return 'text';
  }
}

function buildFieldSchemaObject(table: Table): t.ObjectExpression {
  const fields = getScalarFields(table);
  return t.objectExpression(
    fields.map((f) => {
      const gqlType = f.type.gqlType.replace(/!/g, '');
      let schemaType: string;
      switch (gqlType) {
        case 'Boolean':
          schemaType = 'boolean';
          break;
        case 'Int':
        case 'BigInt':
          schemaType = 'int';
          break;
        case 'Float':
          schemaType = 'float';
          break;
        case 'JSON':
        case 'GeoJSON':
          schemaType = 'json';
          break;
        case 'UUID':
          schemaType = 'uuid';
          break;
        default:
          schemaType = 'string';
      }
      return t.objectProperty(
        t.identifier(f.name),
        t.stringLiteral(schemaType),
      );
    }),
  );
}

function buildSelectObject(table: Table, typeRegistry?: TypeRegistry): t.ObjectExpression {
  const fields = getSelectableScalarFields(table, typeRegistry);
  return t.objectExpression(
    fields.map((f) =>
      t.objectProperty(t.identifier(f.name), t.booleanLiteral(true)),
    ),
  );
}

function buildJsonLog(expr: t.Expression): t.ExpressionStatement {
  return t.expressionStatement(
    t.callExpression(
      t.memberExpression(t.identifier('console'), t.identifier('log')),
      [
        t.callExpression(
          t.memberExpression(t.identifier('JSON'), t.identifier('stringify')),
          [expr, t.nullLiteral(), t.numericLiteral(2)],
        ),
      ],
    ),
  );
}

function buildOrmCall(
  singularName: string,
  methodName: string,
  args: t.ObjectExpression,
): t.Expression {
  return t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(
          t.memberExpression(
            t.identifier('client'),
            t.identifier(singularName),
          ),
          t.identifier(methodName),
        ),
        [args],
      ),
      t.identifier('execute'),
    ),
    [],
  );
}

function buildErrorCatch(errorMessage: string): t.CatchClause {
  return t.catchClause(
    t.identifier('error'),
    t.blockStatement([
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(
            t.identifier('console'),
            t.identifier('error'),
          ),
          [t.stringLiteral(errorMessage)],
        ),
      ),
      t.ifStatement(
        t.binaryExpression(
          'instanceof',
          t.identifier('error'),
          t.identifier('Error'),
        ),
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier('console'),
                t.identifier('error'),
              ),
              [
                t.memberExpression(
                  t.identifier('error'),
                  t.identifier('message'),
                ),
              ],
            ),
          ),
        ]),
      ),
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('process'), t.identifier('exit')),
          [t.numericLiteral(1)],
        ),
      ),
    ]),
  );
}

function buildGetClientStatement(targetName?: string): t.VariableDeclaration {
  const args: t.Expression[] = targetName
    ? [t.stringLiteral(targetName)]
    : [];
  return t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('client'),
      t.callExpression(t.identifier('getClient'), args),
    ),
  ]);
}

function buildArgvType(): t.TSTypeAnnotation {
  return t.tsTypeAnnotation(
    t.tsTypeReference(
      t.identifier('Partial'),
      t.tsTypeParameterInstantiation([
        t.tsTypeReference(
          t.identifier('Record'),
          t.tsTypeParameterInstantiation([
            t.tsStringKeyword(),
            t.tsUnknownKeyword(),
          ]),
        ),
      ]),
    ),
  );
}

function buildSubcommandSwitch(
  subcommands: string[],
  handlerPrefix: string,
  usageVarName: string,
): t.SwitchStatement {
  const cases = subcommands.map((sub) =>
    t.switchCase(t.stringLiteral(sub), [
      t.returnStatement(
        t.callExpression(t.identifier(`${handlerPrefix}${toPascalCase(sub)}`), [
          t.identifier('argv'),
          t.identifier('prompter'),
        ]),
      ),
    ]),
  );
  cases.push(
    t.switchCase(null, [
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('console'), t.identifier('log')),
          [t.identifier(usageVarName)],
        ),
      ),
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('process'), t.identifier('exit')),
          [t.numericLiteral(1)],
        ),
      ),
    ]),
  );
  return t.switchStatement(t.identifier('subcommand'), cases);
}

function buildListHandler(table: Table, targetName?: string, typeRegistry?: TypeRegistry): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const defaultSelectObj = buildSelectObject(table, typeRegistry);

  // --- Build the try body ---
  const tryBody: t.Statement[] = [];

  // const defaultSelect = { id: true, name: true, ... };
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('defaultSelect'), defaultSelectObj),
    ]),
  );

  // const findManyArgs = parseFindManyArgs(argv, defaultSelect);
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('findManyArgs'),
        t.callExpression(t.identifier('parseFindManyArgs'), [
          t.identifier('argv'),
          t.identifier('defaultSelect'),
        ]),
      ),
    ]),
  );

  tryBody.push(buildGetClientStatement(targetName));

  // const result = await client.<singular>.findMany(findManyArgs).execute();
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(
                    t.identifier('client'),
                    t.identifier(singularName),
                  ),
                  t.identifier('findMany'),
                ),
                [t.identifier('findManyArgs')],
              ),
              t.identifier('execute'),
            ),
            [],
          ),
        ),
      ),
    ]),
  );

  tryBody.push(buildJsonLog(t.identifier('result')));

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('_prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  return t.functionDeclaration(
    t.identifier('handleList'),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch('Failed to list records.'),
      ),
    ]),
    false,
    true,
  );
}

/**
 * Build a `handleFindFirst` function — CLI equivalent of the TS SDK's findFirst().
 * Accepts --fields, --where.<field>.<op>, --condition.<field>.<op> flags.
 * Internally calls findMany with first:1 and returns a single record (or null).
 */
function buildFindFirstHandler(table: Table, targetName?: string, typeRegistry?: TypeRegistry): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const defaultSelectObj = buildSelectObject(table, typeRegistry);

  const tryBody: t.Statement[] = [];

  // const defaultSelect = { ... };
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('defaultSelect'), defaultSelectObj),
    ]),
  );

  // const findFirstArgs = parseFindFirstArgs(argv, defaultSelect);
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('findFirstArgs'),
        t.callExpression(t.identifier('parseFindFirstArgs'), [
          t.identifier('argv'),
          t.identifier('defaultSelect'),
        ]),
      ),
    ]),
  );

  tryBody.push(buildGetClientStatement(targetName));

  // const result = await client.<singular>.findFirst(findFirstArgs).execute();
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(t.identifier('client'), t.identifier(singularName)),
                  t.identifier('findFirst'),
                ),
                [t.identifier('findFirstArgs')],
              ),
              t.identifier('execute'),
            ),
            [],
          ),
        ),
      ),
    ]),
  );

  tryBody.push(buildJsonLog(t.identifier('result')));

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('_prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  return t.functionDeclaration(
    t.identifier('handleFindFirst'),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch('Failed to find record.'),
      ),
    ]),
    false,
    true,
  );
}

/**
 * Build a `handleSearch` function for tables with search-capable fields.
 * Extracts the first positional arg as the query string and auto-builds a
 * `where` clause that targets all detected search fields (tsvector, BM25,
 * trigram, vector embedding).  Supports --limit, --offset, --fields, --orderBy.
 */
function buildSearchHandler(
  table: Table,
  specialGroups: SpecialFieldGroup[],
  targetName?: string,
  typeRegistry?: TypeRegistry,
): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const defaultSelectObj = buildSelectObject(table, typeRegistry);

  const tryBody: t.Statement[] = [];

  // const query = Array.isArray(argv._) && argv._.length > 0 ? String(argv._[0]) : undefined;
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('query'),
        t.conditionalExpression(
          t.logicalExpression(
            '&&',
            t.callExpression(
              t.memberExpression(t.identifier('Array'), t.identifier('isArray')),
              [t.memberExpression(t.identifier('argv'), t.identifier('_'))],
            ),
            t.binaryExpression(
              '>',
              t.memberExpression(
                t.memberExpression(t.identifier('argv'), t.identifier('_')),
                t.identifier('length'),
              ),
              t.numericLiteral(0),
            ),
          ),
          t.callExpression(t.identifier('String'), [
            t.memberExpression(
              t.memberExpression(t.identifier('argv'), t.identifier('_')),
              t.numericLiteral(0),
              true,
            ),
          ]),
          t.identifier('undefined'),
        ),
      ),
    ]),
  );

  // if (!query) { console.error('Usage: ... search <query>'); process.exit(1); }
  tryBody.push(
    t.ifStatement(
      t.unaryExpression('!', t.identifier('query')),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('error')),
            [t.stringLiteral('Error: search requires a <query> argument')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('process'), t.identifier('exit')),
            [t.numericLiteral(1)],
          ),
        ),
      ]),
    ),
  );

  // Build the where clause properties from detected search fields
  // e.g. { tsvContent: { query }, bm25Body: { query }, trgmTitle: { value: query, threshold: 0.3 }, vectorEmbedding: { value: query } }
  const whereProps: t.ObjectProperty[] = [];
  for (const group of specialGroups) {
    for (const field of group.fields) {
      if (field.type.gqlType === 'FullText' && !field.type.isArray) {
        // tsvector field: { query }
        whereProps.push(
          t.objectProperty(
            t.identifier(field.name),
            t.objectExpression([
              t.objectProperty(t.identifier('query'), t.identifier('query'), false, true),
            ]),
          ),
        );
      } else if (/Bm25Score$/.test(field.name)) {
        // BM25 computed score field — derive the input field name:
        // bodyBm25Score -> bm25Body (strip trailing "Bm25Score", prefix with "bm25")
        const baseName = field.name.replace(/Bm25Score$/, '');
        const inputFieldName = `bm25${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
        whereProps.push(
          t.objectProperty(
            t.identifier(inputFieldName),
            t.objectExpression([
              t.objectProperty(t.identifier('query'), t.identifier('query'), false, true),
            ]),
          ),
        );
      } else if (/TrgmSimilarity$/.test(field.name)) {
        // Trigram computed score field — derive the input field name:
        // titleTrgmSimilarity -> trgmTitle
        const baseName = field.name.replace(/TrgmSimilarity$/, '');
        const inputFieldName = `trgm${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`;
        whereProps.push(
          t.objectProperty(
            t.identifier(inputFieldName),
            t.objectExpression([
              t.objectProperty(t.identifier('value'), t.identifier('query')),
              t.objectProperty(t.identifier('threshold'), t.numericLiteral(0.3)),
            ]),
          ),
        );
      } else if (group.category === 'embedding') {
        // Vector embedding field: { value: query }
        whereProps.push(
          t.objectProperty(
            t.identifier(field.name),
            t.objectExpression([
              t.objectProperty(t.identifier('value'), t.identifier('query')),
            ]),
          ),
        );
      }
    }
  }

  // const searchWhere = { tsvContent: { query }, ... };
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('searchWhere'),
        t.objectExpression(whereProps),
      ),
    ]),
  );

  // const defaultSelect = { ... };
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('defaultSelect'), defaultSelectObj),
    ]),
  );

  // const findManyArgs = parseFindManyArgs(argv, defaultSelect, searchWhere);
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('findManyArgs'),
        t.callExpression(t.identifier('parseFindManyArgs'), [
          t.identifier('argv'),
          t.identifier('defaultSelect'),
          t.identifier('searchWhere'),
        ]),
      ),
    ]),
  );

  tryBody.push(buildGetClientStatement(targetName));

  // const result = await client.<singular>.findMany(findManyArgs).execute();
  tryBody.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(
                    t.identifier('client'),
                    t.identifier(singularName),
                  ),
                  t.identifier('findMany'),
                ),
                [t.identifier('findManyArgs')],
              ),
              t.identifier('execute'),
            ),
            [],
          ),
        ),
      ),
    ]),
  );

  tryBody.push(buildJsonLog(t.identifier('result')));

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('_prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  return t.functionDeclaration(
    t.identifier('handleSearch'),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch('Failed to search records.'),
      ),
    ]),
    false,
    true,
  );
}

function buildGetHandler(table: Table, targetName?: string, typeRegistry?: TypeRegistry): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const pkFields = getPrimaryKeyInfo(table);
  const pk = pkFields[0];
  const selectObj = buildSelectObject(table, typeRegistry);

  const promptQuestion = t.objectExpression([
    t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
    t.objectProperty(t.identifier('name'), t.stringLiteral(pk.name)),
    t.objectProperty(t.identifier('message'), t.stringLiteral(pk.name)),
    t.objectProperty(t.identifier('required'), t.booleanLiteral(true)),
  ]);

  const pkTsType = pk.gqlType === 'Int' || pk.gqlType === 'BigInt'
    ? t.tsNumberKeyword()
    : t.tsStringKeyword();

  const ormArgs = t.objectExpression([
    t.objectProperty(
      t.identifier(pk.name),
      t.tsAsExpression(
        t.memberExpression(t.identifier('answers'), t.identifier(pk.name)),
        pkTsType,
      ),
    ),
    t.objectProperty(t.identifier('select'), selectObj),
  ]);

  const tryBody: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('answers'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [t.identifier('argv'), t.arrayExpression([promptQuestion])],
          ),
        ),
      ),
    ]),
    buildGetClientStatement(targetName),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(buildOrmCall(singularName, 'findOne', ormArgs)),
      ),
    ]),
    buildJsonLog(t.identifier('result')),
  ];

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  return t.functionDeclaration(
    t.identifier('handleGet'),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch('Record not found.'),
      ),
    ]),
    false,
    true,
  );
}

export function getFieldsWithDefaults(
  table: Table,
  typeRegistry?: TypeRegistry,
): Set<string> {
  const fieldsWithDefaults = new Set<string>();
  if (!typeRegistry) return fieldsWithDefaults;

  const createInputTypeName = getCreateInputTypeName(table);
  const resolved = resolveInnerInputType(createInputTypeName, typeRegistry);
  if (!resolved) return fieldsWithDefaults;

  const innerType = typeRegistry.get(resolved.name);
  if (!innerType?.inputFields) return fieldsWithDefaults;

  for (const field of innerType.inputFields) {
    if (field.defaultValue !== undefined) {
      fieldsWithDefaults.add(field.name);
    }
    if (field.type.kind !== 'NON_NULL') {
      fieldsWithDefaults.add(field.name);
    }
  }

  return fieldsWithDefaults;
}

function buildMutationHandler(
  table: Table,
  operation: 'create' | 'update' | 'delete',
  targetName?: string,
  typeRegistry?: TypeRegistry,
  ormTypes?: { createInputTypeName: string; innerFieldName: string; patchTypeName: string },
): t.FunctionDeclaration {
  const { singularName } = getTableNames(table);
  const pkFields = getPrimaryKeyInfo(table);
  const pk = pkFields[0];

  // Get the set of writable field names from the type registry
  // This filters out computed fields (e.g. searchTsvRank, hashUuid) that exist
  // on the entity type but not on the create/update input type.
  const writableFields = getWritableFieldNames(table, typeRegistry);

  // Get fields that have defaults from introspection (for create operations)
  const fieldsWithDefaults = getFieldsWithDefaults(table, typeRegistry);

  // For create: include fields that are in the create input type.
  // For update/delete: always exclude the PK (it goes in `where`, not `data`).
  // The ORM input-types generator always excludes these fields from create inputs
  // (see EXCLUDED_MUTATION_FIELDS in input-types-generator.ts). We must match this
  // to avoid generating data properties that don't exist on the ORM create type.
  // For non-'id' PKs (e.g. NodeTypeRegistry.name), we allow them in create data
  // since they are user-provided natural keys that DO appear in the create input.
  const ORM_EXCLUDED_FIELDS = ['id', 'createdAt', 'updatedAt', 'nodeId'];
  const editableFields = getScalarFields(table).filter(
    (f) =>
      // For update/delete: always exclude PK (it goes in `where`, not `data`)
      // For create: exclude PK only if it's in the ORM exclusion list (e.g. 'id')
      (f.name !== pk.name || (operation === 'create' && !ORM_EXCLUDED_FIELDS.includes(pk.name))) &&
      // Always exclude ORM-excluded fields (except PK which is handled above)
      (f.name === pk.name || !ORM_EXCLUDED_FIELDS.includes(f.name)) &&
      // If we have type registry info, only include fields that exist in the input type
      (writableFields === null || writableFields.has(f.name)),
  );

  const questions: t.Expression[] = [];

  if (operation === 'update' || operation === 'delete') {
    questions.push(
      t.objectExpression([
        t.objectProperty(t.identifier('type'), t.stringLiteral('text')),
        t.objectProperty(t.identifier('name'), t.stringLiteral(pk.name)),
        t.objectProperty(t.identifier('message'), t.stringLiteral(pk.name)),
        t.objectProperty(t.identifier('required'), t.booleanLiteral(true)),
      ]),
    );
  }

  if (operation !== 'delete') {
    for (const field of editableFields) {
      // For create: field is required only if it has no default value
      // For update: all fields are optional (user only updates what they want)
      const isRequired = operation === 'create' && !fieldsWithDefaults.has(field.name);
      const hasDefault = fieldsWithDefaults.has(field.name);
      const questionType = getQuestionTypeForField(field);
      const questionProps = [
        t.objectProperty(t.identifier('type'), t.stringLiteral(questionType)),
        t.objectProperty(
          t.identifier('name'),
          t.stringLiteral(field.name),
        ),
        t.objectProperty(
          t.identifier('message'),
          t.stringLiteral(field.name),
        ),
        t.objectProperty(
          t.identifier('required'),
          t.booleanLiteral(isRequired),
        ),
      ];
      // Skip prompting for fields with backend-managed defaults.
      // The field still appears in man pages and can be overridden via CLI flags.
      if (hasDefault) {
        questionProps.push(
          t.objectProperty(
            t.identifier('skipPrompt'),
            t.booleanLiteral(true),
          ),
        );
      }
      questions.push(t.objectExpression(questionProps));
    }
  }

  const selectObj =
    operation === 'delete'
      ? t.objectExpression([
          t.objectProperty(t.identifier(pk.name), t.booleanLiteral(true)),
        ])
      : buildSelectObject(table, typeRegistry);

  let ormArgs: t.ObjectExpression;

  // Build data properties without individual type assertions.
  // Instead, we build a plain object from cleanedData and cast the entire
  // data value through `unknown` to bridge the type gap between
  // Record<string, unknown> and the ORM's specific input type.
  // This handles scalars, enums (string literal unions like ObjectCategory),
  // and array fields uniformly without needing to import each type.
  const buildDataProps = () =>
    editableFields.map((f) =>
      t.objectProperty(
        t.identifier(f.name),
        t.memberExpression(t.identifier('cleanedData'), t.identifier(f.name)),
      ),
    );


  if (operation === 'create') {
    ormArgs = t.objectExpression([
      t.objectProperty(
        t.identifier('data'),
        t.objectExpression(buildDataProps()),
      ),
      t.objectProperty(t.identifier('select'), selectObj),
    ]);
  } else if (operation === 'update') {
    ormArgs = t.objectExpression([
      t.objectProperty(
        t.identifier('where'),
        t.objectExpression([
          t.objectProperty(
            t.identifier(pk.name),
            t.tsAsExpression(
              t.memberExpression(t.identifier('answers'), t.identifier(pk.name)),
              pk.gqlType === 'Int' || pk.gqlType === 'BigInt'
                ? t.tsNumberKeyword()
                : t.tsStringKeyword(),
            ),
          ),
        ]),
      ),
      t.objectProperty(
        t.identifier('data'),
        t.objectExpression(buildDataProps()),
      ),
      t.objectProperty(t.identifier('select'), selectObj),
    ]);
  } else {
    ormArgs = t.objectExpression([
      t.objectProperty(
        t.identifier('where'),
        t.objectExpression([
          t.objectProperty(
            t.identifier(pk.name),
            t.tsAsExpression(
              t.memberExpression(t.identifier('answers'), t.identifier(pk.name)),
              pk.gqlType === 'Int' || pk.gqlType === 'BigInt'
                ? t.tsNumberKeyword()
                : t.tsStringKeyword(),
            ),
          ),
        ]),
      ),
      t.objectProperty(t.identifier('select'), selectObj),
    ]);
  }

  const tryBody: t.Statement[] = [
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('rawAnswers'),
        t.awaitExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('prompter'),
              t.identifier('prompt'),
            ),
            [t.identifier('argv'), t.arrayExpression(questions)],
          ),
        ),
      ),
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('answers'),
        t.callExpression(t.identifier('coerceAnswers'), [
          t.identifier('rawAnswers'),
          t.identifier('fieldSchema'),
        ]),
      ),
    ]),
  ];

  if (operation !== 'delete') {
    // Build stripUndefined call and cast to the proper ORM input type
    // so that property accesses on cleanedData are correctly typed.
    const stripUndefinedCall = t.callExpression(t.identifier('stripUndefined'), [
      t.identifier('answers'),
      t.identifier('fieldSchema'),
    ]);

    let cleanedDataExpr: t.Expression = stripUndefinedCall;
    if (ormTypes) {
      if (operation === 'create') {
        // cleanedData as CreateXxxInput['fieldName']
        cleanedDataExpr = t.tsAsExpression(
          stripUndefinedCall,
          t.tsIndexedAccessType(
            t.tsTypeReference(t.identifier(ormTypes.createInputTypeName)),
            t.tsLiteralType(t.stringLiteral(ormTypes.innerFieldName)),
          ),
        );
      } else if (operation === 'update') {
        // cleanedData as XxxPatch
        cleanedDataExpr = t.tsAsExpression(
          stripUndefinedCall,
          t.tsTypeReference(t.identifier(ormTypes.patchTypeName)),
        );
      }
    }

    tryBody.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier('cleanedData'),
          cleanedDataExpr,
        ),
      ]),
    );
  }

  tryBody.push(
    buildGetClientStatement(targetName),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('result'),
        t.awaitExpression(
          buildOrmCall(singularName, operation, ormArgs),
        ),
      ),
    ]),
    buildJsonLog(t.identifier('result')),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  const handlerName = `handle${ucFirst(operation)}`;

  return t.functionDeclaration(
    t.identifier(handlerName),
    [argvParam, prompterParam],
    t.blockStatement([
      t.tryStatement(
        t.blockStatement(tryBody),
        buildErrorCatch(`Failed to ${operation} record.`),
      ),
    ]),
    false,
    true,
  );
}

export interface TableCommandOptions {
  targetName?: string;
  executorImportPath?: string;
  /** TypeRegistry from introspection, used to check field defaults */
  typeRegistry?: TypeRegistry;
}

export function generateTableCommand(table: Table, options?: TableCommandOptions): GeneratedFile {
  const { singularName } = getTableNames(table);
  const commandName = toKebabCase(singularName);
  const statements: t.Statement[] = [];
  const executorPath = options?.executorImportPath ?? '../executor';

  statements.push(
    createImportDeclaration('inquirerer', [
      'CLIOptions',
      'Inquirerer',
      'extractFirst',
    ]),
  );
  statements.push(
    createImportDeclaration(executorPath, ['getClient']),
  );

  const utilsPath = options?.targetName ? '../../utils' : '../utils';
  statements.push(
    createImportDeclaration(utilsPath, ['coerceAnswers', 'parseFindFirstArgs', 'parseFindManyArgs', 'stripUndefined']),
  );
  statements.push(
    createImportDeclaration(utilsPath, ['FieldSchema'], true),
  );

  // Import ORM input types for proper type assertions in mutation handlers.
  // These types ensure that cleanedData is cast to the correct ORM input type
  // (e.g., CreateAppPermissionInput['appPermission'] for create, AppPermissionPatch for update)
  // instead of remaining as Record<string, unknown>.
  const createInputTypeName = getCreateInputTypeName(table);
  const patchTypeName = getPatchTypeName(table);
  const innerFieldName = lcFirst(table.name);
  // Commands are at cli/commands/xxx.ts (no target) or cli/commands/{target}/xxx.ts (with target).
  // ORM input-types is at orm/input-types.ts — two or three levels up from commands.
  const inputTypesPath = options?.targetName
    ? `../../../orm/input-types`
    : `../../orm/input-types`;
  statements.push(
    createImportDeclaration(inputTypesPath, [createInputTypeName, patchTypeName], true),
  );

  // Generate field schema for type coercion
  // Use explicit FieldSchema type annotation so TS narrows string literals to FieldType
  const fieldSchemaId = t.identifier('fieldSchema');
  fieldSchemaId.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('FieldSchema')),
  );
  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        fieldSchemaId,
        buildFieldSchemaObject(table),
      ),
    ]),
  );

  // Determine which operations the ORM model supports for this table.
  // Most tables have `one: null` simply because there's no dedicated GraphQL
  // findOne query, but the ORM still generates `findOne` using the PK.
  // The only tables WITHOUT `findOne` are pure record types from SQL functions
  // (e.g. GetAllRecord, OrgGetManagersRecord) which have no update/delete either.
  // We detect these by checking: if one, update, AND delete are all null, it's a
  // read-only record type with no `findOne`.
  const hasUpdate = table.query?.update !== undefined && table.query?.update !== null;
  const hasDelete = table.query?.delete !== undefined && table.query?.delete !== null;
  const hasGet = table.query?.one !== null || hasUpdate || hasDelete;

  // Detect whether this table has search-capable fields (tsvector, BM25, trgm, vector embedding)
  const specialGroups = categorizeSpecialFields(table, options?.typeRegistry);
  const hasSearchFields = specialGroups.some(
    (g) => g.category === 'search' || g.category === 'embedding',
  );

  const subcommands: string[] = ['list', 'find-first'];
  if (hasSearchFields) subcommands.push('search');
  if (hasGet) subcommands.push('get');
  subcommands.push('create');
  if (hasUpdate) subcommands.push('update');
  if (hasDelete) subcommands.push('delete');

  const usageLines = [
    '',
    `${commandName} <command>`,
    '',
    'Commands:',
    `  list                  List ${singularName} records`,
    `  find-first            Find first matching ${singularName} record`,
  ];
  if (hasSearchFields) usageLines.push(`  search <query>        Search ${singularName} records`);
  if (hasGet) usageLines.push(`  get                   Get a ${singularName} by ID`);
  usageLines.push(`  create                Create a new ${singularName}`);
  if (hasUpdate) usageLines.push(`  update                Update an existing ${singularName}`);
  if (hasDelete) usageLines.push(`  delete                Delete a ${singularName}`);
  usageLines.push(
    '',
    'List Options:',
    '  --limit <n>           Max number of records to return (forward pagination)',
    '  --last <n>            Number of records from the end (backward pagination)',
    '  --after <cursor>      Cursor for forward pagination',
    '  --before <cursor>     Cursor for backward pagination',
    '  --offset <n>          Number of records to skip',
    '  --fields <fields>     Comma-separated list of fields to return',
    '  --where.<field>.<op>  Filter (dot-notation, e.g. --where.name.equalTo foo)',
    '  --condition.<f>.<op>  Condition filter (dot-notation)',
    '  --orderBy <values>    Comma-separated ordering values (e.g. NAME_ASC,CREATED_AT_DESC)',
    '',
    'Find-First Options:',
    '  --fields <fields>     Comma-separated list of fields to return',
    '  --where.<field>.<op>  Filter (dot-notation, e.g. --where.status.equalTo active)',
    '  --condition.<f>.<op>  Condition filter (dot-notation)',
    '',
  );
  if (hasSearchFields) {
    usageLines.push(
      'Search Options:',
      '  <query>               Search query string (required)',
      '  --limit <n>           Max number of records to return',
      '  --offset <n>          Number of records to skip',
      '  --fields <fields>     Comma-separated list of fields to return',
      '  --orderBy <values>    Comma-separated list of ordering values',
      '',
    );
  }
  usageLines.push(
    '  --help, -h            Show this help message',
    '',
  );

  statements.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier('usage'),
        t.stringLiteral(usageLines.join('\n')),
      ),
    ]),
  );

  const argvParam = t.identifier('argv');
  argvParam.typeAnnotation = buildArgvType();
  const prompterParam = t.identifier('prompter');
  prompterParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );
  const optionsParam = t.identifier('_options');
  optionsParam.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('CLIOptions')),
  );

  const mainBody: t.Statement[] = [
    t.ifStatement(
      t.logicalExpression(
        '||',
        t.memberExpression(t.identifier('argv'), t.identifier('help')),
        t.memberExpression(t.identifier('argv'), t.identifier('h')),
      ),
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('log')),
            [t.identifier('usage')],
          ),
        ),
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('process'),
              t.identifier('exit'),
            ),
            [t.numericLiteral(0)],
          ),
        ),
      ]),
    ),
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.objectPattern([
          t.objectProperty(
            t.identifier('first'),
            t.identifier('subcommand'),
          ),
          t.objectProperty(
            t.identifier('newArgv'),
            t.identifier('newArgv'),
            false,
            true,
          ),
        ]),
        t.callExpression(t.identifier('extractFirst'), [
          t.identifier('argv'),
        ]),
      ),
    ]),
    t.ifStatement(
      t.unaryExpression('!', t.identifier('subcommand')),
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('answer'),
            t.awaitExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier('prompter'),
                  t.identifier('prompt'),
                ),
                [
                  t.identifier('argv'),
                  t.arrayExpression([
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier('type'),
                        t.stringLiteral('autocomplete'),
                      ),
                      t.objectProperty(
                        t.identifier('name'),
                        t.stringLiteral('subcommand'),
                      ),
                      t.objectProperty(
                        t.identifier('message'),
                        t.stringLiteral('What do you want to do?'),
                      ),
                      t.objectProperty(
                        t.identifier('options'),
                        t.arrayExpression(
                          subcommands.map((s) => t.stringLiteral(s)),
                        ),
                      ),
                    ]),
                  ]),
                ],
              ),
            ),
          ),
        ]),
        t.returnStatement(
          t.callExpression(t.identifier('handleTableSubcommand'), [
            t.tsAsExpression(
              t.memberExpression(
                t.identifier('answer'),
                t.identifier('subcommand'),
              ),
              t.tsStringKeyword(),
            ),
            t.identifier('newArgv'),
            t.identifier('prompter'),
          ]),
        ),
      ]),
    ),
    t.returnStatement(
      t.callExpression(t.identifier('handleTableSubcommand'), [
        t.identifier('subcommand'),
        t.identifier('newArgv'),
        t.identifier('prompter'),
      ]),
    ),
  ];

  statements.push(
    t.exportDefaultDeclaration(
      t.arrowFunctionExpression(
        [argvParam, prompterParam, optionsParam],
        t.blockStatement(mainBody),
        true,
      ),
    ),
  );

  const subcmdParam = t.identifier('subcommand');
  subcmdParam.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword());
  const argvParam2 = t.identifier('argv');
  argvParam2.typeAnnotation = buildArgvType();
  const prompterParam2 = t.identifier('prompter');
  prompterParam2.typeAnnotation = t.tsTypeAnnotation(
    t.tsTypeReference(t.identifier('Inquirerer')),
  );

  statements.push(
    t.functionDeclaration(
      t.identifier('handleTableSubcommand'),
      [subcmdParam, argvParam2, prompterParam2],
      t.blockStatement([
        buildSubcommandSwitch(subcommands, 'handle', 'usage'),
      ]),
      false,
      true,
    ),
  );

  const tn = options?.targetName;
  const ormTypes = { createInputTypeName, patchTypeName, innerFieldName };
  statements.push(buildListHandler(table, tn, options?.typeRegistry));
  statements.push(buildFindFirstHandler(table, tn, options?.typeRegistry));
  if (hasSearchFields) statements.push(buildSearchHandler(table, specialGroups, tn, options?.typeRegistry));
  if (hasGet) statements.push(buildGetHandler(table, tn, options?.typeRegistry));
  statements.push(buildMutationHandler(table, 'create', tn, options?.typeRegistry, ormTypes));
  if (hasUpdate) statements.push(buildMutationHandler(table, 'update', tn, options?.typeRegistry, ormTypes));
  if (hasDelete) statements.push(buildMutationHandler(table, 'delete', tn, options?.typeRegistry, ormTypes));

  const header = getGeneratedFileHeader(`CLI commands for ${table.name}`);
  const code = generateCode(statements);

  return {
    fileName: options?.targetName
      ? `commands/${options.targetName}/${commandName}.ts`
      : `commands/${commandName}.ts`,
    content: header + '\n' + code,
  };
}
