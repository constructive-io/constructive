/**
 * Schema types generator for React Query hooks (non-ORM mode)
 *
 * Generates TypeScript interfaces for:
 * 1. INPUT_OBJECT types (e.g., BootstrapUserInput, LoginInput)
 * 2. Payload OBJECT types (e.g., BootstrapUserPayload, LoginPayload)
 * 3. ENUM types (e.g., FieldCategory, TableCategory)
 *
 * These types are referenced by custom mutation/query hooks but not generated
 * elsewhere in non-ORM mode.
 *
 * Uses Babel AST for robust code generation.
 */
import * as t from '@babel/types';

import type {
  CleanArgument,
  ResolvedType,
  TypeRegistry
} from '../../types/schema';
import { generateCode } from './babel-ast';
import {
  BASE_FILTER_TYPE_NAMES,
  SCALAR_NAMES,
  scalarToTsType
} from './scalars';
import { getTypeBaseName } from './type-resolver';
import { getGeneratedFileHeader } from './utils';

export interface GeneratedSchemaTypesFile {
  fileName: string;
  content: string;
  generatedEnums: string[];
  referencedTableTypes: string[];
}

export interface GenerateSchemaTypesOptions {
  typeRegistry: TypeRegistry;
  tableTypeNames: Set<string>;
}

const SKIP_TYPES = new Set([
  ...SCALAR_NAMES,
  'Query',
  'Mutation',
  'Subscription',
  '__Schema',
  '__Type',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__Directive',
  ...BASE_FILTER_TYPE_NAMES
]);

const SKIP_TYPE_PATTERNS: RegExp[] = [];

function typeRefToTs(typeRef: CleanArgument['type']): string {
  if (typeRef.kind === 'NON_NULL') {
    if (typeRef.ofType) {
      return typeRefToTs(typeRef.ofType as CleanArgument['type']);
    }
    return typeRef.name ?? 'unknown';
  }

  if (typeRef.kind === 'LIST') {
    if (typeRef.ofType) {
      return `${typeRefToTs(typeRef.ofType as CleanArgument['type'])}[]`;
    }
    return 'unknown[]';
  }

  const name = typeRef.name ?? 'unknown';
  return scalarToTsType(name, { unknownScalar: 'name' });
}

function isRequired(typeRef: CleanArgument['type']): boolean {
  return typeRef.kind === 'NON_NULL';
}

function shouldSkipType(
  typeName: string,
  tableTypeNames: Set<string>
): boolean {
  if (SKIP_TYPES.has(typeName)) return true;
  if (tableTypeNames.has(typeName)) return true;

  for (const pattern of SKIP_TYPE_PATTERNS) {
    if (pattern.test(typeName)) return true;
  }

  return false;
}

function generateEnumTypes(
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>
): { statements: t.Statement[]; generatedTypes: Set<string> } {
  const statements: t.Statement[] = [];
  const generatedTypes = new Set<string>();

  for (const [typeName, typeInfo] of typeRegistry) {
    if (typeInfo.kind !== 'ENUM') continue;
    if (shouldSkipType(typeName, tableTypeNames)) continue;
    if (!typeInfo.enumValues || typeInfo.enumValues.length === 0) continue;

    const unionType = t.tsUnionType(
      typeInfo.enumValues.map((v) => t.tsLiteralType(t.stringLiteral(v)))
    );
    const typeAlias = t.tsTypeAliasDeclaration(
      t.identifier(typeName),
      null,
      unionType
    );
    statements.push(t.exportNamedDeclaration(typeAlias));
    generatedTypes.add(typeName);
  }

  return { statements, generatedTypes };
}

function generateInputObjectTypes(
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>,
  alreadyGenerated: Set<string>
): { statements: t.Statement[]; generatedTypes: Set<string> } {
  const statements: t.Statement[] = [];
  const generatedTypes = new Set<string>(alreadyGenerated);
  const typesToGenerate = new Set<string>();

  for (const [typeName, typeInfo] of typeRegistry) {
    if (typeInfo.kind !== 'INPUT_OBJECT') continue;
    if (shouldSkipType(typeName, tableTypeNames)) continue;
    if (generatedTypes.has(typeName)) continue;
    typesToGenerate.add(typeName);
  }

  while (typesToGenerate.size > 0) {
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName)) continue;

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo || typeInfo.kind !== 'INPUT_OBJECT') continue;

    generatedTypes.add(typeName);

    const properties: t.TSPropertySignature[] = [];

    if (typeInfo.inputFields && typeInfo.inputFields.length > 0) {
      for (const field of typeInfo.inputFields) {
        const optional = !isRequired(field.type);
        const tsType = typeRefToTs(field.type);

        const prop = t.tsPropertySignature(
          t.identifier(field.name),
          t.tsTypeAnnotation(t.tsTypeReference(t.identifier(tsType)))
        );
        prop.optional = optional;
        properties.push(prop);

        const baseType = getTypeBaseName(field.type);
        if (
          baseType &&
          !generatedTypes.has(baseType) &&
          !shouldSkipType(baseType, tableTypeNames)
        ) {
          const nestedType = typeRegistry.get(baseType);
          if (nestedType?.kind === 'INPUT_OBJECT') {
            typesToGenerate.add(baseType);
          }
        }
      }
    }

    const interfaceDecl = t.tsInterfaceDeclaration(
      t.identifier(typeName),
      null,
      null,
      t.tsInterfaceBody(properties)
    );
    statements.push(t.exportNamedDeclaration(interfaceDecl));
  }

  return { statements, generatedTypes };
}

function generateUnionTypes(
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>,
  alreadyGenerated: Set<string>
): { statements: t.Statement[]; generatedTypes: Set<string> } {
  const statements: t.Statement[] = [];
  const generatedTypes = new Set<string>(alreadyGenerated);

  for (const [typeName, typeInfo] of typeRegistry) {
    if (typeInfo.kind !== 'UNION') continue;
    if (shouldSkipType(typeName, tableTypeNames)) continue;
    if (generatedTypes.has(typeName)) continue;
    if (!typeInfo.possibleTypes || typeInfo.possibleTypes.length === 0) continue;

    const unionType = t.tsUnionType(
      typeInfo.possibleTypes.map((pt) => t.tsTypeReference(t.identifier(pt)))
    );
    const typeAlias = t.tsTypeAliasDeclaration(
      t.identifier(typeName),
      null,
      unionType
    );
    statements.push(t.exportNamedDeclaration(typeAlias));
    generatedTypes.add(typeName);
  }

  return { statements, generatedTypes };
}

export interface PayloadTypesResult {
  statements: t.Statement[];
  generatedTypes: Set<string>;
  referencedTableTypes: Set<string>;
}

function collectReturnTypesFromRootTypes(
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>
): Set<string> {
  const returnTypes = new Set<string>();

  const queryType = typeRegistry.get('Query');
  const mutationType = typeRegistry.get('Mutation');

  const processFields = (fields: ResolvedType['fields']) => {
    if (!fields) return;
    for (const field of fields) {
      const baseType = getTypeBaseName(field.type);
      if (baseType && !shouldSkipType(baseType, tableTypeNames)) {
        const typeInfo = typeRegistry.get(baseType);
        if (typeInfo?.kind === 'OBJECT') {
          returnTypes.add(baseType);
        }
      }
    }
  };

  if (queryType?.fields) processFields(queryType.fields);
  if (mutationType?.fields) processFields(mutationType.fields);

  return returnTypes;
}

function generatePayloadObjectTypes(
  typeRegistry: TypeRegistry,
  tableTypeNames: Set<string>,
  alreadyGenerated: Set<string>
): PayloadTypesResult {
  const statements: t.Statement[] = [];
  const generatedTypes = new Set<string>(alreadyGenerated);
  const referencedTableTypes = new Set<string>();

  const typesToGenerate = collectReturnTypesFromRootTypes(
    typeRegistry,
    tableTypeNames
  );

  for (const typeName of Array.from(typesToGenerate)) {
    if (generatedTypes.has(typeName)) {
      typesToGenerate.delete(typeName);
    }
  }

  while (typesToGenerate.size > 0) {
    const typeNameResult = typesToGenerate.values().next();
    if (typeNameResult.done) break;
    const typeName: string = typeNameResult.value;
    typesToGenerate.delete(typeName);

    if (generatedTypes.has(typeName)) continue;

    const typeInfo = typeRegistry.get(typeName);
    if (!typeInfo || typeInfo.kind !== 'OBJECT') continue;

    generatedTypes.add(typeName);

    const properties: t.TSPropertySignature[] = [];

    if (typeInfo.fields && typeInfo.fields.length > 0) {
      for (const field of typeInfo.fields) {
        const baseType = getTypeBaseName(field.type);

        if (baseType === 'Query' || baseType === 'Mutation') continue;

        const tsType = typeRefToTs(field.type);
        const isNullable = !isRequired(field.type);

        const finalType = isNullable ? `${tsType} | null` : tsType;

        const prop = t.tsPropertySignature(
          t.identifier(field.name),
          t.tsTypeAnnotation(t.tsTypeReference(t.identifier(finalType)))
        );
        prop.optional = isNullable;
        properties.push(prop);

        if (baseType && tableTypeNames.has(baseType)) {
          referencedTableTypes.add(baseType);
        }

        if (
          baseType &&
          !generatedTypes.has(baseType) &&
          !shouldSkipType(baseType, tableTypeNames)
        ) {
          const nestedType = typeRegistry.get(baseType);
          if (nestedType?.kind === 'OBJECT') {
            typesToGenerate.add(baseType);
          }
        }
      }
    }

    const interfaceDecl = t.tsInterfaceDeclaration(
      t.identifier(typeName),
      null,
      null,
      t.tsInterfaceBody(properties)
    );
    statements.push(t.exportNamedDeclaration(interfaceDecl));
  }

  return { statements, generatedTypes, referencedTableTypes };
}

export function generateSchemaTypesFile(
  options: GenerateSchemaTypesOptions
): GeneratedSchemaTypesFile {
  const { typeRegistry, tableTypeNames } = options;

  const allStatements: t.Statement[] = [];
  let generatedTypes = new Set<string>();

  const enumResult = generateEnumTypes(typeRegistry, tableTypeNames);
  generatedTypes = new Set([...generatedTypes, ...enumResult.generatedTypes]);

  const unionResult = generateUnionTypes(
    typeRegistry,
    tableTypeNames,
    generatedTypes
  );
  generatedTypes = new Set([...generatedTypes, ...unionResult.generatedTypes]);

  const inputResult = generateInputObjectTypes(
    typeRegistry,
    tableTypeNames,
    generatedTypes
  );
  generatedTypes = new Set([...generatedTypes, ...inputResult.generatedTypes]);

  const payloadResult = generatePayloadObjectTypes(
    typeRegistry,
    tableTypeNames,
    generatedTypes
  );

  const referencedTableTypes = Array.from(
    payloadResult.referencedTableTypes
  ).sort();
  const baseFilterImports = Array.from(BASE_FILTER_TYPE_NAMES).sort();
  const allTypesImports = [...referencedTableTypes, ...baseFilterImports];

  if (allTypesImports.length > 0) {
    const typesImport = t.importDeclaration(
      allTypesImports.map((ti) => t.importSpecifier(t.identifier(ti), t.identifier(ti))),
      t.stringLiteral('./types')
    );
    typesImport.importKind = 'type';
    allStatements.push(typesImport);
  }

  allStatements.push(...enumResult.statements);
  allStatements.push(...unionResult.statements);
  allStatements.push(...inputResult.statements);
  allStatements.push(...payloadResult.statements);

  const code = generateCode(allStatements);
  const content = getGeneratedFileHeader('GraphQL schema types for custom operations') + '\n\n' + code;

  return {
    fileName: 'schema-types.ts',
    content,
    generatedEnums: Array.from(enumResult.generatedTypes).sort(),
    referencedTableTypes
  };
}
