/**
 * Types generator - generates types.ts with entity interfaces using AST
 */
import type { CleanTable } from '../../types/schema';
import {
  createProject,
  createSourceFile,
  getFormattedOutput,
  createFileHeader,
  createInterface,
  type InterfaceProperty,
} from './ts-ast';
import { getScalarFields, fieldTypeToTs } from './utils';
import { generateBaseFilterTypes } from './filters';

/**
 * Generate types.ts content with all entity interfaces and base filter types
 */
export function generateTypesFile(tables: CleanTable[]): string {
  const project = createProject();
  const sourceFile = createSourceFile(project, 'types.ts');

  // Add file header
  sourceFile.insertText(0, createFileHeader('Entity types and filter types') + '\n\n');

  // Add section comment
  sourceFile.addStatements('// ============================================================================');
  sourceFile.addStatements('// Entity types');
  sourceFile.addStatements('// ============================================================================\n');

  // Generate entity interfaces
  for (const table of tables) {
    const scalarFields = getScalarFields(table);

    const properties: InterfaceProperty[] = scalarFields.map((field) => ({
      name: field.name,
      type: `${fieldTypeToTs(field.type)} | null`,
    }));

    sourceFile.addInterface(createInterface(table.name, properties));
  }

  // Add section comment for filters
  sourceFile.addStatements('\n// ============================================================================');
  sourceFile.addStatements('// Filter types (shared)');
  sourceFile.addStatements('// ============================================================================\n');

  // Add base filter types (using string concat for complex types - acceptable for static definitions)
  const filterTypesContent = generateBaseFilterTypes();
  // Extract just the interfaces part (skip the header)
  const filterInterfaces = filterTypesContent
    .split('\n')
    .slice(6) // Skip header lines
    .join('\n');

  sourceFile.addStatements(filterInterfaces);

  return getFormattedOutput(sourceFile);
}

/**
 * Generate a minimal entity type (just id and display fields)
 */
export function generateMinimalEntityType(table: CleanTable): string {
  const project = createProject();
  const sourceFile = createSourceFile(project, 'minimal.ts');

  const scalarFields = getScalarFields(table);

  // Find id and likely display fields
  const displayFields = scalarFields.filter((f) => {
    const name = f.name.toLowerCase();
    return (
      name === 'id' ||
      name === 'name' ||
      name === 'title' ||
      name === 'label' ||
      name === 'email' ||
      name.endsWith('name') ||
      name.endsWith('title')
    );
  });

  // If no display fields found, take first 5 scalar fields
  const fieldsToUse = displayFields.length > 0 ? displayFields : scalarFields.slice(0, 5);

  const properties: InterfaceProperty[] = fieldsToUse.map((field) => ({
    name: field.name,
    type: `${fieldTypeToTs(field.type)} | null`,
  }));

  sourceFile.addInterface(createInterface(`${table.name}Minimal`, properties));

  return getFormattedOutput(sourceFile);
}
