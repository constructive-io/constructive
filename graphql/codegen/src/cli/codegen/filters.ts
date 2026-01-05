/**
 * PostGraphile filter type generators
 *
 * Generates TypeScript interfaces for PostGraphile filter types:
 * - Base scalar filters (StringFilter, IntFilter, etc.)
 * - Table-specific filters (CarFilter, UserFilter, etc.)
 * - OrderBy enum types
 */
import type { CleanTable, CleanField } from '../../types/schema';
import {
  getFilterTypeName,
  getOrderByTypeName,
  getScalarFilterType,
  getScalarFields,
  toScreamingSnake,
  getGeneratedFileHeader,
} from './utils';

// ============================================================================
// Base filter type definitions
// ============================================================================

/**
 * Generate all base PostGraphile filter types
 * These are shared across all tables
 */
export function generateBaseFilterTypes(): string {
  return `${getGeneratedFileHeader('PostGraphile base filter types')}

// ============================================================================
// String filters
// ============================================================================

export interface StringFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
  includes?: string;
  notIncludes?: string;
  includesInsensitive?: string;
  notIncludesInsensitive?: string;
  startsWith?: string;
  notStartsWith?: string;
  startsWithInsensitive?: string;
  notStartsWithInsensitive?: string;
  endsWith?: string;
  notEndsWith?: string;
  endsWithInsensitive?: string;
  notEndsWithInsensitive?: string;
  like?: string;
  notLike?: string;
  likeInsensitive?: string;
  notLikeInsensitive?: string;
}

export interface StringListFilter {
  isNull?: boolean;
  equalTo?: string[];
  notEqualTo?: string[];
  distinctFrom?: string[];
  notDistinctFrom?: string[];
  lessThan?: string[];
  lessThanOrEqualTo?: string[];
  greaterThan?: string[];
  greaterThanOrEqualTo?: string[];
  contains?: string[];
  containedBy?: string[];
  overlaps?: string[];
  anyEqualTo?: string;
  anyNotEqualTo?: string;
  anyLessThan?: string;
  anyLessThanOrEqualTo?: string;
  anyGreaterThan?: string;
  anyGreaterThanOrEqualTo?: string;
}

// ============================================================================
// Numeric filters
// ============================================================================

export interface IntFilter {
  isNull?: boolean;
  equalTo?: number;
  notEqualTo?: number;
  distinctFrom?: number;
  notDistinctFrom?: number;
  in?: number[];
  notIn?: number[];
  lessThan?: number;
  lessThanOrEqualTo?: number;
  greaterThan?: number;
  greaterThanOrEqualTo?: number;
}

export interface IntListFilter {
  isNull?: boolean;
  equalTo?: number[];
  notEqualTo?: number[];
  distinctFrom?: number[];
  notDistinctFrom?: number[];
  lessThan?: number[];
  lessThanOrEqualTo?: number[];
  greaterThan?: number[];
  greaterThanOrEqualTo?: number[];
  contains?: number[];
  containedBy?: number[];
  overlaps?: number[];
  anyEqualTo?: number;
  anyNotEqualTo?: number;
  anyLessThan?: number;
  anyLessThanOrEqualTo?: number;
  anyGreaterThan?: number;
  anyGreaterThanOrEqualTo?: number;
}

export interface FloatFilter {
  isNull?: boolean;
  equalTo?: number;
  notEqualTo?: number;
  distinctFrom?: number;
  notDistinctFrom?: number;
  in?: number[];
  notIn?: number[];
  lessThan?: number;
  lessThanOrEqualTo?: number;
  greaterThan?: number;
  greaterThanOrEqualTo?: number;
}

export interface BigIntFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

export interface BigFloatFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

// ============================================================================
// Boolean filter
// ============================================================================

export interface BooleanFilter {
  isNull?: boolean;
  equalTo?: boolean;
  notEqualTo?: boolean;
  distinctFrom?: boolean;
  notDistinctFrom?: boolean;
  in?: boolean[];
  notIn?: boolean[];
}

// ============================================================================
// UUID filter
// ============================================================================

export interface UUIDFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

export interface UUIDListFilter {
  isNull?: boolean;
  equalTo?: string[];
  notEqualTo?: string[];
  distinctFrom?: string[];
  notDistinctFrom?: string[];
  lessThan?: string[];
  lessThanOrEqualTo?: string[];
  greaterThan?: string[];
  greaterThanOrEqualTo?: string[];
  contains?: string[];
  containedBy?: string[];
  overlaps?: string[];
  anyEqualTo?: string;
  anyNotEqualTo?: string;
  anyLessThan?: string;
  anyLessThanOrEqualTo?: string;
  anyGreaterThan?: string;
  anyGreaterThanOrEqualTo?: string;
}

// ============================================================================
// Date/Time filters
// ============================================================================

export interface DatetimeFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

export interface DateFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

export interface TimeFilter {
  isNull?: boolean;
  equalTo?: string;
  notEqualTo?: string;
  distinctFrom?: string;
  notDistinctFrom?: string;
  in?: string[];
  notIn?: string[];
  lessThan?: string;
  lessThanOrEqualTo?: string;
  greaterThan?: string;
  greaterThanOrEqualTo?: string;
}

// ============================================================================
// JSON filter
// ============================================================================

export interface JSONFilter {
  isNull?: boolean;
  equalTo?: unknown;
  notEqualTo?: unknown;
  distinctFrom?: unknown;
  notDistinctFrom?: unknown;
  in?: unknown[];
  notIn?: unknown[];
  contains?: unknown;
  containedBy?: unknown;
  containsKey?: string;
  containsAllKeys?: string[];
  containsAnyKeys?: string[];
}
`;
}

// ============================================================================
// Table-specific filter generators
// ============================================================================

/**
 * Generate filter interface for a specific table
 */
export function generateTableFilter(table: CleanTable): string {
  const filterTypeName = getFilterTypeName(table);
  const scalarFields = getScalarFields(table);

  const fieldFilters = scalarFields
    .map((field) => {
      const filterType = getFieldFilterType(field);
      if (!filterType) return null;
      return `  ${field.name}?: ${filterType};`;
    })
    .filter(Boolean)
    .join('\n');

  return `export interface ${filterTypeName} {
${fieldFilters}
  /** Logical AND */
  and?: ${filterTypeName}[];
  /** Logical OR */
  or?: ${filterTypeName}[];
  /** Logical NOT */
  not?: ${filterTypeName};
}`;
}

/**
 * Get the filter type for a specific field
 */
function getFieldFilterType(field: CleanField): string | null {
  const { gqlType, isArray } = field.type;

  // Handle array types
  if (isArray) {
    const cleanType = gqlType.replace(/!/g, '');
    switch (cleanType) {
      case 'String':
        return 'StringListFilter';
      case 'Int':
        return 'IntListFilter';
      case 'UUID':
        return 'UUIDListFilter';
      default:
        return null;
    }
  }

  return getScalarFilterType(gqlType);
}

// ============================================================================
// OrderBy enum generators
// ============================================================================

/**
 * Generate OrderBy type for a specific table
 */
export function generateTableOrderBy(table: CleanTable): string {
  const orderByTypeName = getOrderByTypeName(table);
  const scalarFields = getScalarFields(table);

  const fieldOrderBys = scalarFields.flatMap((field) => {
    const screamingName = toScreamingSnake(field.name);
    return [`'${screamingName}_ASC'`, `'${screamingName}_DESC'`];
  });

  // Add standard PostGraphile order options
  const standardOrderBys = [
    "'NATURAL'",
    "'PRIMARY_KEY_ASC'",
    "'PRIMARY_KEY_DESC'",
  ];

  const allOrderBys = [...fieldOrderBys, ...standardOrderBys];

  return `export type ${orderByTypeName} = ${allOrderBys.join(' | ')};`;
}

// ============================================================================
// Combined generators for hook files
// ============================================================================

/**
 * Generate inline filter and orderBy types for a query hook file
 * These are embedded directly in the hook file for self-containment
 */
export function generateInlineFilterTypes(table: CleanTable): string {
  const filterDef = generateTableFilter(table);
  const orderByDef = generateTableOrderBy(table);

  return `${filterDef}

${orderByDef}`;
}
