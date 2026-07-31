/**
 * Re-export custom AST utilities from @constructive-io/graphql-query.
 *
 * These custom AST builders handle PostgreSQL types that need subfield selections
 * (geometry, interval, etc.). The canonical implementations now live in graphql-query.
 */
export {
  geometryAst,
  geometryCollectionAst,
  geometryPointAst,
  getCustomAst,
  getCustomAstForCleanField,
  intervalAst,
  isIntervalType,
  requiresSubfieldSelection,
} from '@constructive-io/graphql-query';
