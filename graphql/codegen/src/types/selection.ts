/**
 * Field selection types for controlling which fields are included in queries
 */

/**
 * Simple field selection options
 */
export interface SimpleFieldSelection {
  /** Specific fields to include */
  select?: string[];
  /** Relations to include with their fields */
  include?: Record<string, string[] | boolean>;
  /** Simple relation inclusion (just names) */
  includeRelations?: string[];
  /** Fields to exclude */
  exclude?: string[];
  /** Maximum depth for nested relations */
  maxDepth?: number;
}

/**
 * Predefined field selection presets
 */
export type FieldSelectionPreset =
  /** Just id and primary display field */
  | 'minimal'
  /** Common display fields */
  | 'display'
  /** All scalar fields */
  | 'all'
  /** All fields including relations */
  | 'full';

/**
 * Main field selection type - preset or custom
 */
export type FieldSelection = FieldSelectionPreset | SimpleFieldSelection;

/**
 * Internal selection options format used by query builder
 */
export interface SelectionOptions {
  [fieldName: string]:
    | boolean
    | {
        select: Record<string, boolean>;
        variables?: Record<string, unknown>;
      };
}
