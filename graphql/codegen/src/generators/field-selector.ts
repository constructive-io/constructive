/**
 * Simplified field selection system
 * Converts user-friendly selection options to internal SelectionOptions format
 */
import type { QuerySelectionOptions } from '../core/types';
import type { CleanTable } from '../types/schema';
import type {
  FieldSelection,
  FieldSelectionPreset,
  SimpleFieldSelection,
} from '../types/selection';

/**
 * Convert simplified field selection to QueryBuilder SelectionOptions
 */
export function convertToSelectionOptions(
  table: CleanTable,
  allTables: CleanTable[],
  selection?: FieldSelection,
): QuerySelectionOptions | null {
  if (!selection) {
    return convertPresetToSelection(table, 'display');
  }

  if (typeof selection === 'string') {
    return convertPresetToSelection(table, selection);
  }

  return convertCustomSelectionToOptions(table, allTables, selection);
}

/**
 * Convert preset to selection options
 */
function convertPresetToSelection(
  table: CleanTable,
  preset: FieldSelectionPreset,
): QuerySelectionOptions {
  const options: QuerySelectionOptions = {};

  switch (preset) {
    case 'minimal': {
      // Just id and first display field
      const minimalFields = getMinimalFields(table);
      minimalFields.forEach((field) => {
        options[field] = true;
      });
      break;
    }

    case 'display': {
      // Common display fields
      const displayFields = getDisplayFields(table);
      displayFields.forEach((field) => {
        options[field] = true;
      });
      break;
    }

    case 'all': {
      // All non-relational fields (includes complex fields like JSON, geometry, etc.)
      const allFields = getNonRelationalFields(table);
      allFields.forEach((field) => {
        options[field] = true;
      });
      break;
    }

    case 'full':
      // All fields including basic relations
      table.fields.forEach((field) => {
        options[field.name] = true;
      });
      break;

    default: {
      // Default to display
      const defaultFields = getDisplayFields(table);
      defaultFields.forEach((field) => {
        options[field] = true;
      });
    }
  }

  return options;
}

/**
 * Convert custom selection to options
 */
function convertCustomSelectionToOptions(
  table: CleanTable,
  allTables: CleanTable[],
  selection: SimpleFieldSelection,
): QuerySelectionOptions {
  const options: QuerySelectionOptions = {};

  // Start with selected fields or all non-relational fields (including complex types)
  let fieldsToInclude: string[];

  if (selection.select) {
    fieldsToInclude = selection.select;
  } else {
    fieldsToInclude = getNonRelationalFields(table);
  }

  // Add basic fields
  fieldsToInclude.forEach((field) => {
    if (table.fields.some((f) => f.name === field)) {
      options[field] = true;
    }
  });

  // Handle includeRelations (simple API for relation fields)
  if (selection.includeRelations) {
    selection.includeRelations.forEach((relationField) => {
      if (isRelationalField(relationField, table)) {
        // Include with dynamically determined scalar fields from the related table
        options[relationField] = {
          select: getRelatedTableScalarFields(relationField, table, allTables),
          variables: {},
        };
      }
    });
  }

  // Handle includes (relations) - more detailed API
  if (selection.include) {
    Object.entries(selection.include).forEach(
      ([relationField, relationSelection]) => {
        if (isRelationalField(relationField, table)) {
          if (relationSelection === true) {
            // Include with dynamically determined scalar fields from the related table
            options[relationField] = {
              select: getRelatedTableScalarFields(
                relationField,
                table,
                allTables,
              ),
              variables: {},
            };
          } else if (Array.isArray(relationSelection)) {
            // Include with specific fields
            const selectObj: Record<string, boolean> = {};
            relationSelection.forEach((field) => {
              selectObj[field] = true;
            });
            options[relationField] = {
              select: selectObj,
              variables: {},
            };
          }
        }
      },
    );
  }

  // Handle excludes
  if (selection.exclude) {
    selection.exclude.forEach((field) => {
      delete options[field];
    });
  }

  return options;
}

/**
 * Get minimal fields - completely schema-driven, no hardcoded assumptions
 */
function getMinimalFields(table: CleanTable): string[] {
  // Get all non-relational fields from the actual schema
  const nonRelationalFields = getNonRelationalFields(table);

  // Return the first few fields from the schema (typically includes primary key and basic fields)
  // This is completely dynamic based on what the schema actually provides
  return nonRelationalFields.slice(0, 3); // Limit to first 3 fields for minimal selection
}

/**
 * Get display fields - completely schema-driven, no hardcoded field names
 */
function getDisplayFields(table: CleanTable): string[] {
  // Get all non-relational fields from the actual schema
  const nonRelationalFields = getNonRelationalFields(table);

  // Return a reasonable subset for display purposes (first half of available fields)
  // This is completely dynamic based on what the schema actually provides
  const maxDisplayFields = Math.max(
    5,
    Math.floor(nonRelationalFields.length / 2),
  );
  return nonRelationalFields.slice(0, maxDisplayFields);
}

/**
 * Get all non-relational fields (includes both scalar and complex fields)
 * Complex fields like JSON, geometry, images should be included by default
 */
function getNonRelationalFields(table: CleanTable): string[] {
  return table.fields
    .filter((field) => !isRelationalField(field.name, table))
    .map((field) => field.name);
}

/**
 * Check if a field is relational using table metadata
 */
export function isRelationalField(
  fieldName: string,
  table: CleanTable,
): boolean {
  const { belongsTo, hasOne, hasMany, manyToMany } = table.relations;

  return (
    belongsTo.some((rel) => rel.fieldName === fieldName) ||
    hasOne.some((rel) => rel.fieldName === fieldName) ||
    hasMany.some((rel) => rel.fieldName === fieldName) ||
    manyToMany.some((rel) => rel.fieldName === fieldName)
  );
}

/**
 * Get scalar fields for a related table to include in relation queries
 * Uses only the _meta query data - no hardcoded field names or assumptions
 */
function getRelatedTableScalarFields(
  relationField: string,
  table: CleanTable,
  allTables: CleanTable[],
): Record<string, boolean> {
  // Find the related table name
  let referencedTableName: string | undefined;

  // Check belongsTo relations
  const belongsToRel = table.relations.belongsTo.find(
    (rel) => rel.fieldName === relationField,
  );
  if (belongsToRel) {
    referencedTableName = belongsToRel.referencesTable;
  }

  // Check hasOne relations
  if (!referencedTableName) {
    const hasOneRel = table.relations.hasOne.find(
      (rel) => rel.fieldName === relationField,
    );
    if (hasOneRel) {
      referencedTableName = hasOneRel.referencedByTable;
    }
  }

  // Check hasMany relations
  if (!referencedTableName) {
    const hasManyRel = table.relations.hasMany.find(
      (rel) => rel.fieldName === relationField,
    );
    if (hasManyRel) {
      referencedTableName = hasManyRel.referencedByTable;
    }
  }

  // Check manyToMany relations
  if (!referencedTableName) {
    const manyToManyRel = table.relations.manyToMany.find(
      (rel) => rel.fieldName === relationField,
    );
    if (manyToManyRel) {
      referencedTableName = manyToManyRel.rightTable;
    }
  }

  if (!referencedTableName) {
    // No related table found - return empty selection
    return {};
  }

  // Find the related table in allTables
  const relatedTable = allTables.find((t) => t.name === referencedTableName);
  if (!relatedTable) {
    // Related table not found in schema - return empty selection
    return {};
  }

  // Get ALL scalar fields from the related table (non-relational fields)
  // This is completely dynamic based on the actual schema
  const scalarFields = relatedTable.fields
    .filter((field) => !isRelationalField(field.name, relatedTable))
    .map((field) => field.name);

  // Perf guardrail: select a small, display-oriented subset.
  const MAX_RELATED_FIELDS = 8;
  const preferred = [
    'displayName',
    'fullName',
    'preferredName',
    'nickname',
    'firstName',
    'lastName',
    'username',
    'email',
    'name',
    'title',
    'label',
    'slug',
    'code',
    'createdAt',
    'updatedAt',
  ];

  const included: string[] = [];
  const push = (fieldName: string | undefined) => {
    if (!fieldName) return;
    if (!scalarFields.includes(fieldName)) return;
    if (included.includes(fieldName)) return;
    if (included.length >= MAX_RELATED_FIELDS) return;
    included.push(fieldName);
  };

  // Always try to include stable identifiers first.
  push('id');
  push('nodeId');

  for (const fieldName of preferred) push(fieldName);
  for (const fieldName of scalarFields) push(fieldName);

  const selection: Record<string, boolean> = {};
  for (const fieldName of included) selection[fieldName] = true;
  return selection;
}

/**
 * Get all available relation fields from a table
 */
export function getAvailableRelations(table: CleanTable): Array<{
  fieldName: string;
  type: 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';
  referencedTable?: string;
}> {
  const relations: Array<{
    fieldName: string;
    type: 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';
    referencedTable?: string;
  }> = [];

  // Add belongsTo relations
  table.relations.belongsTo.forEach((rel) => {
    if (rel.fieldName) {
      relations.push({
        fieldName: rel.fieldName,
        type: 'belongsTo',
        referencedTable: rel.referencesTable || undefined,
      });
    }
  });

  // Add hasOne relations
  table.relations.hasOne.forEach((rel) => {
    if (rel.fieldName) {
      relations.push({
        fieldName: rel.fieldName,
        type: 'hasOne',
        referencedTable: rel.referencedByTable || undefined,
      });
    }
  });

  // Add hasMany relations
  table.relations.hasMany.forEach((rel) => {
    if (rel.fieldName) {
      relations.push({
        fieldName: rel.fieldName,
        type: 'hasMany',
        referencedTable: rel.referencedByTable || undefined,
      });
    }
  });

  // Add manyToMany relations
  table.relations.manyToMany.forEach((rel) => {
    if (rel.fieldName) {
      relations.push({
        fieldName: rel.fieldName,
        type: 'manyToMany',
        referencedTable: rel.rightTable || undefined,
      });
    }
  });

  return relations;
}

/**
 * Validate field selection against table schema
 */
export function validateFieldSelection(
  selection: FieldSelection,
  table: CleanTable,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof selection === 'string') {
    // Presets are always valid
    return { isValid: true, errors: [] };
  }

  const tableFieldNames = table.fields.map((f) => f.name);

  // Validate select fields
  if (selection.select) {
    selection.select.forEach((field) => {
      if (!tableFieldNames.includes(field)) {
        errors.push(`Field '${field}' does not exist in table '${table.name}'`);
      }
    });
  }

  // Validate includeRelations fields
  if (selection.includeRelations) {
    selection.includeRelations.forEach((field) => {
      if (!isRelationalField(field, table)) {
        errors.push(
          `Field '${field}' is not a relational field in table '${table.name}'`,
        );
      }
    });
  }

  // Validate include fields
  if (selection.include) {
    Object.keys(selection.include).forEach((field) => {
      if (!isRelationalField(field, table)) {
        errors.push(
          `Field '${field}' is not a relational field in table '${table.name}'`,
        );
      }
    });
  }

  // Validate exclude fields
  if (selection.exclude) {
    selection.exclude.forEach((field) => {
      if (!tableFieldNames.includes(field)) {
        errors.push(
          `Exclude field '${field}' does not exist in table '${table.name}'`,
        );
      }
    });
  }

  // Validate maxDepth
  if (selection.maxDepth !== undefined) {
    if (
      typeof selection.maxDepth !== 'number' ||
      selection.maxDepth < 0 ||
      selection.maxDepth > 5
    ) {
      errors.push('maxDepth must be a number between 0 and 5');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
