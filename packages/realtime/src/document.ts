/**
 * GraphQL subscription document builders.
 *
 * These utilities build the GraphQL subscription documents that
 * the RealtimeClient sends over the WebSocket connection. In the
 * codegen output, each table gets a pre-built document; these
 * helpers are used by the codegen templates.
 */

import type { SubscriptionFieldMeta } from './types';

/**
 * Build a GraphQL subscription document for a table's change events.
 *
 * @example
 * ```ts
 * const doc = buildSubscriptionDocument(
 *   { fieldName: 'onContactChanged', tableName: 'contact', dataFieldName: 'contact' },
 *   ['id', 'name', 'email', 'createdAt'],
 *   'ContactFilter'
 * );
 * // Result:
 * // subscription OnContactChanged($filter: ContactFilter) {
 * //   onContactChanged(filter: $filter) {
 * //     event
 * //     contact { id name email createdAt }
 * //     timestamp
 * //   }
 * // }
 * ```
 */
export function buildSubscriptionDocument(
  meta: SubscriptionFieldMeta,
  selectFields: string[],
  filterTypeName?: string
): string {
  const operationName = meta.fieldName.charAt(0).toUpperCase() + meta.fieldName.slice(1);
  const fieldSelection = selectFields.join(' ');

  const variablesDef = filterTypeName ? `($filter: ${filterTypeName})` : '';
  const argsRef = filterTypeName ? '(filter: $filter)' : '';

  return [
    `subscription ${operationName}${variablesDef} {`,
    `  ${meta.fieldName}${argsRef} {`,
    `    event`,
    `    ${meta.dataFieldName} { ${fieldSelection} }`,
    `    timestamp`,
    `  }`,
    `}`,
  ].join('\n');
}

/**
 * Build the variables object for a subscription document.
 */
export function buildSubscriptionVariables<TFilter>(
  filter?: TFilter
): Record<string, unknown> {
  if (!filter) return {};
  return { filter };
}
