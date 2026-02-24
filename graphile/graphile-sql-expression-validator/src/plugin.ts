/**
 * PostGraphile v5 SQL Expression Validator Plugin
 *
 * Validates SQL expressions in mutation inputs for columns tagged with
 * `@sqlExpression`. The plugin:
 *
 * 1. Hooks into mutation fields via GraphQLObjectType_fields_field
 * 2. For each mutation whose pgCodec has `@sqlExpression` attributes:
 *    - Finds the text column's GraphQL name
 *    - Looks for a companion AST column (via @rawSqlAstField tag or `{name}_ast`)
 *    - Wraps the field's plan to add a sideEffect step that validates input
 *    - Throws on invalid SQL expressions (transaction rolls back)
 *
 * IMPORTANT: This plugin uses the per-field hook (GraphQLObjectType_fields_field)
 * which provides `pgCodec` in scope. This ensures validation is ONLY applied to
 * mutation fields whose associated table has @sqlExpression columns — not to
 * unrelated mutations like signUp, login, etc.
 *
 * The plugin uses grafast's `sideEffect` step for validation rather than wrapping
 * the resolver. In v5, mutation fields use plans and defining a GraphQL resolver
 * on a plan-based field causes "Query planning error: expects a plan to be
 * available; forbidden from defining a GraphQL resolver."
 */

import type { GraphileConfig } from 'graphile-config';
import 'graphile-build';
import 'graphile-build-pg';
import { sideEffect } from 'grafast';
import {
  parseAndValidateSqlExpression,
  validateAst,
  DEFAULT_ALLOWED_FUNCTIONS
} from './validator';
import type { SqlExpressionValidatorOptions } from './validator';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Find a value in a potentially nested mutation input object.
 * Input is typically 1 level deep, but we traverse defensively to avoid
 * silently skipping deeper/nested mutation payloads.
 */
function findValue(input: Record<string, unknown>, key: string): unknown {
  const visited = new Set<object>();
  const stack: Array<{ node: Record<string, unknown>; depth: number }> = [
    { node: input, depth: 0 }
  ];
  const maxDepth = 32;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const { node, depth } = current;

    if (key in node) {
      return node[key];
    }

    if (visited.has(node) || depth >= maxDepth) {
      continue;
    }
    visited.add(node);

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        stack.push({
          node: value as Record<string, unknown>,
          depth: depth + 1
        });
      }
    }
  }

  return undefined;
}

// ─── Column metadata ──────────────────────────────────────────────

/**
 * Column metadata collected during the schema hook for @sqlExpression columns.
 */
interface SqlExprColumnInfo {
  attrName: string;
  gqlName: string;
  astGqlName: string | null;
}

// ─── Plugin factory ───────────────────────────────────────────────

/**
 * Creates the SQL Expression Validator PostGraphile v5 plugin.
 *
 * Options are pre-computed at build time (allowedFunctions lowercased
 * into a Set) to avoid per-execution allocations.
 *
 * @param validatorOptions - Options for SQL expression validation.
 * @returns GraphileConfig.Plugin
 */
export function createSqlExpressionValidatorPlugin(
  validatorOptions: SqlExpressionValidatorOptions = {}
): GraphileConfig.Plugin {
  // Pre-compute at plugin creation time
  const {
    allowedFunctions = DEFAULT_ALLOWED_FUNCTIONS,
    allowedSchemas = [],
    maxExpressionLength = 10000
  } = validatorOptions;

  const precomputedOptions: SqlExpressionValidatorOptions = {
    allowedFunctions,
    allowedSchemas,
    maxExpressionLength
  };

  return {
    name: 'SqlExpressionValidatorPlugin',
    version: '2.0.0',
    description:
      'Validates SQL expressions in mutation inputs for @sqlExpression columns',

    schema: {
      hooks: {
        GraphQLObjectType_fields_field(field, build, context) {
          const {
            scope: { isRootMutation, pgCodec }
          } = context;

          // Only process mutation fields
          if (!isRootMutation) {
            return field;
          }

          // Only process if this mutation's codec has attributes
          if (
            !pgCodec ||
            !('attributes' in pgCodec) ||
            !pgCodec.attributes
          ) {
            return field;
          }

          const attrs = pgCodec.attributes as Record<
            string,
            { extensions?: { tags?: Record<string, unknown> } }
          >;

          // Find @sqlExpression columns on THIS mutation's codec only
          const sqlExpressionColumns: SqlExprColumnInfo[] = [];

          for (const [attrName, attr] of Object.entries(attrs)) {
            const tags = attr.extensions?.tags;
            if (!tags?.sqlExpression) continue;

            // Derive GraphQL field name via inflection
            const gqlName = build.inflection.attribute({
              attributeName: attrName,
              codec: pgCodec
            } as Parameters<typeof build.inflection.attribute>[0]);

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
                codec: pgCodec
              } as Parameters<typeof build.inflection.attribute>[0]);
            } else if (
              typeof rawSqlAstFieldTag === 'string' &&
              rawSqlAstFieldTag.trim()
            ) {
              const pgExt = (
                pgCodec as {
                  extensions?: {
                    pg?: { schemaName?: string; name?: string };
                  };
                }
              )?.extensions?.pg;
              throw new Error(
                `@rawSqlAstField points to missing column "${astDbName}" on ${pgExt?.schemaName ?? 'unknown'}.${pgExt?.name ?? 'unknown'}`
              );
            }

            sqlExpressionColumns.push({
              attrName,
              gqlName,
              astGqlName
            });
          }

          // If no @sqlExpression columns on this codec, pass through unchanged
          if (sqlExpressionColumns.length === 0) {
            return field;
          }

          // Wrap the plan function (NOT resolve) for v5 compatibility
          if (!('plan' in field) || typeof field.plan !== 'function') {
            return field;
          }

          const originalPlan = field.plan;

          return {
            ...field,
            plan($parent: unknown, fieldArgs: { get: (name: string) => unknown }) {
              // Get the input argument as a step
              const $input = fieldArgs.get('input');

              // Add a validation sideEffect step.
              // $input is a grafast step, cast for type compatibility.
              sideEffect($input as Parameters<typeof sideEffect>[0], async (inputValue: unknown) => {
                if (
                  !inputValue ||
                  typeof inputValue !== 'object'
                )
                  return;

                const input = inputValue as Record<string, unknown>;

                for (const col of sqlExpressionColumns) {
                  const {
                    gqlName: textGqlName,
                    astGqlName
                  } = col;

                  const textValue = findValue(input, textGqlName);
                  const astValue = astGqlName
                    ? findValue(input, astGqlName)
                    : undefined;

                  // Validate text input
                  if (textValue !== undefined && textValue !== null) {
                    const result =
                      await parseAndValidateSqlExpression(
                        textValue as string,
                        precomputedOptions
                      );
                    if (!result.valid) {
                      throw new Error(
                        `Invalid SQL expression in ${textGqlName}: ${result.error}`
                      );
                    }
                  }

                  // Validate standalone AST input (only when text is absent)
                  if (
                    astValue !== undefined &&
                    astValue !== null &&
                    textValue === undefined &&
                    astGqlName
                  ) {
                    const result = await validateAst(
                      astValue,
                      precomputedOptions
                    );
                    if (!result.valid) {
                      throw new Error(
                        `Invalid SQL expression AST in ${astGqlName}: ${result.error}`
                      );
                    }
                  }
                }
              });

              // Call the original plan — the mutation proceeds normally.
              // If the sideEffect throws, the transaction rolls back.
              return (originalPlan as Function).call(this, $parent, fieldArgs);
            }
          } as typeof field;
        }
      }
    }
  };
}

// ─── Preset factory ───────────────────────────────────────────────

/**
 * Creates a preset that includes the SQL expression validator plugin.
 *
 * @example
 * ```typescript
 * import { SqlExpressionValidatorPreset } from 'graphile-sql-expression-validator';
 *
 * const preset: GraphileConfig.Preset = {
 *   extends: [
 *     SqlExpressionValidatorPreset({
 *       allowedSchemas: ['app_public'],
 *     }),
 *   ],
 * };
 * ```
 */
export function SqlExpressionValidatorPreset(
  options: SqlExpressionValidatorOptions = {}
): GraphileConfig.Preset {
  return {
    plugins: [createSqlExpressionValidatorPlugin(options)]
  };
}
