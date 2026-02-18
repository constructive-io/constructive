/**
 * PostGraphile v5 SQL Expression Validator Plugin
 *
 * Validates and normalizes SQL expressions in mutation inputs for columns
 * tagged with `@sqlExpression`. The plugin:
 *
 * 1. Hooks into mutation fields via GraphQLObjectType_fields
 * 2. For each table attribute tagged `@sqlExpression`:
 *    - Finds the text column's GraphQL name
 *    - Looks for a companion AST column (via @rawSqlAstField tag or `{name}_ast`)
 *    - Wraps the field's resolve to validate text input, throwing on failure
 *    - Rewrites the text to canonical (deparsed) form
 *    - Optionally writes the AST to the companion column
 *
 * In v5, mutation fields still support resolvers for backwards compatibility
 * when using the grafserv pipeline. This plugin wraps the resolver (not the
 * plan) because the validation logic is inherently runtime (depends on user
 * input and potentially database queries for allowOwnedSchemas).
 */

import type { GraphileConfig } from 'graphile-config';
import 'graphile-build';
import 'graphile-build-pg';
import { parseAndValidateSqlExpression, validateAst } from './validator';
import type { SqlExpressionValidatorOptions } from './types';

/**
 * Cache key for storing owned schemas per-request on the GraphQL context.
 */
const OWNED_SCHEMAS_CACHE_KEY = Symbol(
  'sqlExpressionValidator.ownedSchemas'
);

/**
 * Resolve the effective options by querying the database for owned schemas
 * (if allowOwnedSchemas is enabled) and merging additional schemas from
 * the getAdditionalAllowedSchemas callback.
 */
async function resolveEffectiveOptions(
  baseOptions: SqlExpressionValidatorOptions,
  gqlContext: any
): Promise<SqlExpressionValidatorOptions> {
  const {
    allowedSchemas = [],
    allowOwnedSchemas = false,
    getAdditionalAllowedSchemas,
    ...rest
  } = baseOptions;

  const effectiveSchemas = [...allowedSchemas];

  // In v5, database access is via withPgClient from the context
  if (allowOwnedSchemas && gqlContext) {
    let ownedSchemas: string[] = gqlContext[OWNED_SCHEMAS_CACHE_KEY];
    if (!ownedSchemas) {
      try {
        // v5: use withPgClient if available, fall back to pgClient (v4 compat)
        const pgClient = gqlContext.pgClient;
        if (pgClient) {
          const result = await pgClient.query(
            `SELECT schema_name FROM metaschema_public.schema WHERE database_id = jwt_private.current_database_id()`
          );
          ownedSchemas = result.rows.map(
            (row: any) => row.schema_name
          );
          gqlContext[OWNED_SCHEMAS_CACHE_KEY] = ownedSchemas;
        } else {
          ownedSchemas = [];
        }
      } catch (_err) {
        ownedSchemas = [];
      }
    }
    effectiveSchemas.push(...ownedSchemas);
  }

  if (getAdditionalAllowedSchemas) {
    try {
      const additionalSchemas =
        await getAdditionalAllowedSchemas(gqlContext);
      effectiveSchemas.push(...additionalSchemas);
    } catch (_err) {
      // Silently ignore errors from callback
    }
  }

  const uniqueSchemas = [...new Set(effectiveSchemas)];
  return {
    ...rest,
    allowedSchemas: uniqueSchemas
  };
}

/**
 * Recursively find a key in a nested object, returning the path.
 */
function findInputPath(
  obj: any,
  key: string,
  path: string[] = []
): string[] | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const [k, v] of Object.entries(obj)) {
    if (k === key) {
      return [...path, k];
    }
    if (v && typeof v === 'object') {
      const result = findInputPath(v, key, [...path, k]);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Get a deeply nested value by path.
 */
function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Set a deeply nested value by path, creating intermediate objects as needed.
 */
function setNestedValue(obj: any, path: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (current[path[i]] === undefined) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

/**
 * Replace the last segment of a path with a new segment.
 */
function replaceLastSegment(
  path: string[],
  newSegment: string
): string[] {
  return [...path.slice(0, -1), newSegment];
}

/**
 * Check if the parent object at the given path exists and is an object,
 * meaning we can set a sibling property on it.
 */
function canSetSiblingColumn(
  args: any,
  path: string[],
  _columnName: string
): boolean {
  const parentPath = path.slice(0, -1);
  const parent = getNestedValue(args, parentPath);
  return parent && typeof parent === 'object';
}

/**
 * Creates the SQL Expression Validator PostGraphile v5 plugin.
 *
 * @param validatorOptions - Options for SQL expression validation.
 * @returns GraphileConfig.Plugin
 */
export function createSqlExpressionValidatorPlugin(
  validatorOptions: SqlExpressionValidatorOptions = {}
): GraphileConfig.Plugin {
  return {
    name: 'SqlExpressionValidatorPlugin',
    version: '2.0.0',
    description:
      'Validates and normalizes SQL expressions in mutation inputs for @sqlExpression columns',

    schema: {
      hooks: {
        GraphQLObjectType_fields(fields, build, context) {
          const { Self } = context;

          // Only wrap mutation fields
          if (Self.name !== 'Mutation') {
            return fields;
          }

          const { pgRegistry } = build.input as any;
          if (!pgRegistry) return fields;

          const newFields: typeof fields = {};

          for (const [fieldName, fieldSpec] of Object.entries(fields)) {
            // Find @sqlExpression columns across all resources
            const sqlExpressionColumns: Array<{
              attrName: string;
              gqlName: string;
              astDbName: string;
              astAttr: any;
              astGqlName: string | null;
              resource: any;
            }> = [];

            for (const resource of Object.values(
              pgRegistry.pgResources
            ) as any[]) {
              if (
                !resource.codec?.attributes ||
                resource.codec?.isAnonymous
              )
                continue;

              const attrs = resource.codec.attributes as Record<
                string,
                any
              >;
              for (const [attrName, attr] of Object.entries(attrs)) {
                const tags = attr.extensions?.tags;
                if (!tags?.sqlExpression) continue;

                // Derive GraphQL field name via inflection
                const gqlName = build.inflection.attribute({
                  attributeName: attrName,
                  codec: resource.codec
                });

                // Look for companion AST column
                const rawSqlAstFieldTag = tags?.rawSqlAstField;
                const astDbName =
                  typeof rawSqlAstFieldTag === 'string' &&
                  rawSqlAstFieldTag.trim()
                    ? rawSqlAstFieldTag.trim()
                    : `${attrName}_ast`;

                const astAttr = attrs[astDbName];
                let astGqlName: string | null = null;

                if (astAttr) {
                  astGqlName = build.inflection.attribute({
                    attributeName: astDbName,
                    codec: resource.codec
                  });
                } else if (
                  typeof rawSqlAstFieldTag === 'string' &&
                  rawSqlAstFieldTag.trim()
                ) {
                  const pgExt = resource.codec?.extensions?.pg as
                    | { schemaName?: string; name?: string }
                    | undefined;
                  throw new Error(
                    `@rawSqlAstField points to missing column "${astDbName}" on ${pgExt?.schemaName ?? 'unknown'}.${pgExt?.name ?? 'unknown'}`
                  );
                }

                sqlExpressionColumns.push({
                  attrName,
                  gqlName,
                  astDbName,
                  astAttr,
                  astGqlName,
                  resource
                });
              }
            }

            // If no @sqlExpression columns found, pass through unchanged
            if (sqlExpressionColumns.length === 0) {
              newFields[fieldName] = fieldSpec;
              continue;
            }

            // Wrap the field to add validation
            const originalResolve =
              (fieldSpec as any).resolve ||
              ((obj: any) => obj[fieldName]);

            newFields[fieldName] = {
              ...fieldSpec,
              resolve: async (
                source: any,
                args: any,
                gqlContext: any,
                info: any
              ) => {
                const effectiveOptions =
                  await resolveEffectiveOptions(
                    validatorOptions,
                    gqlContext
                  );

                for (const col of sqlExpressionColumns) {
                  const {
                    gqlName: textGqlName,
                    astGqlName
                  } = col;

                  const inputPath = findInputPath(
                    args,
                    textGqlName
                  );
                  const astInputPath = astGqlName
                    ? findInputPath(args, astGqlName)
                    : null;

                  // Validate text input
                  if (inputPath) {
                    const textValue = getNestedValue(
                      args,
                      inputPath
                    );
                    if (
                      textValue !== undefined &&
                      textValue !== null
                    ) {
                      const result =
                        await parseAndValidateSqlExpression(
                          textValue,
                          effectiveOptions
                        );
                      if (!result.valid) {
                        throw new Error(
                          `Invalid SQL expression in ${textGqlName}: ${result.error}`
                        );
                      }
                      // Rewrite to canonical form
                      setNestedValue(
                        args,
                        inputPath,
                        result.canonicalText
                      );
                      // Optionally write AST to companion column
                      if (
                        astGqlName &&
                        (astInputPath ||
                          canSetSiblingColumn(
                            args,
                            inputPath,
                            astGqlName
                          ))
                      ) {
                        const astPath =
                          astInputPath ||
                          replaceLastSegment(
                            inputPath,
                            astGqlName
                          );
                        setNestedValue(
                          args,
                          astPath,
                          result.ast
                        );
                      }
                    }
                  }

                  // Validate standalone AST input (when text is not provided)
                  if (
                    astInputPath &&
                    !inputPath &&
                    astGqlName
                  ) {
                    const astValue = getNestedValue(
                      args,
                      astInputPath
                    );
                    if (
                      astValue !== undefined &&
                      astValue !== null
                    ) {
                      const result = await validateAst(
                        astValue,
                        effectiveOptions
                      );
                      if (!result.valid) {
                        throw new Error(
                          `Invalid SQL expression AST in ${astGqlName}: ${result.error}`
                        );
                      }
                      // Set canonical text on the text column
                      const textPath = replaceLastSegment(
                        astInputPath,
                        textGqlName
                      );
                      if (
                        canSetSiblingColumn(
                          args,
                          astInputPath,
                          textGqlName
                        )
                      ) {
                        setNestedValue(
                          args,
                          textPath,
                          result.canonicalText
                        );
                      }
                    }
                  }
                }

                return originalResolve(
                  source,
                  args,
                  gqlContext,
                  info
                );
              }
            } as any;
          }

          return newFields;
        }
      }
    }
  };
}

/**
 * Convenience alias using the factory function name pattern.
 */
export const SqlExpressionValidatorPlugin =
  createSqlExpressionValidatorPlugin;
