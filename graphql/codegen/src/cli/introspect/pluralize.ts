/**
 * Pluralization utilities for inferring entity names from PostGraphile patterns
 *
 * Re-exports from 'inflekt' which provides PostGraphile-compatible inflection
 * with Latin suffix overrides (schemata → schema, criteria → criterion, etc.)
 */
export {
  singularize,
  pluralize,
  lcFirst,
  ucFirst,
  toFieldName,
  toQueryName,
} from 'inflekt';
