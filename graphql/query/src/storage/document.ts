/**
 * Dynamic GraphQL document construction for storage surfaces.
 *
 * Every name in the emitted document comes from the plane's `_meta`-reported
 * surface — nothing here assembles or guesses a GraphQL name.
 */

import * as t from 'gql-ast';
import { OperationTypeNode, print } from 'graphql';

import type { StorageSurface } from './types';

const UPLOAD_PAYLOAD_FIELDS = [
  'uploadUrl',
  'fileId',
  'key',
  'deduplicated',
  'expiresAt',
  'previousVersionId',
] as const;

/**
 * Build the single-file upload mutation document for a storage plane:
 *
 *   mutation UploadAppFileMutation($input: UploadAppFileInput!) {
 *     uploadAppFile(input: $input) {
 *       uploadUrl fileId key deduplicated expiresAt previousVersionId
 *     }
 *   }
 */
export function buildUploadDocument(surface: StorageSurface): string {
  const { mutation, inputType } = surface.upload;

  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.MUTATION,
        name: `${capitalize(mutation)}Mutation`,
        variableDefinitions: [
          t.variableDefinition({
            variable: t.variable({ name: 'input' }),
            type: t.nonNullType({ type: t.namedType({ type: inputType }) }),
          }),
        ],
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: mutation,
              args: [t.argument({ name: 'input', value: t.variable({ name: 'input' }) })],
              selectionSet: t.selectionSet({
                selections: UPLOAD_PAYLOAD_FIELDS.map((name) => t.field({ name })),
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return print(ast);
}

/**
 * Build the download-URL query document for a file row on a storage plane,
 * looked up through the files type's single-row query field reported by
 * `_meta` (`query.one`, e.g. `appFile`), selecting the plane's computed
 * download field.
 */
export function buildDownloadUrlDocument(surface: StorageSurface): string {
  if (!surface.downloadUrlField) {
    throw new Error(
      `STORAGE_SURFACE_NO_DOWNLOAD_FIELD: plane ${surface.filesType} reports no download-URL field`,
    );
  }
  const nodeField = surface.filesNodeField;
  if (!nodeField) {
    throw new Error(
      `STORAGE_SURFACE_NO_NODE_FIELD: plane ${surface.filesType} reports no single-row query field`,
    );
  }

  const ast = t.document({
    definitions: [
      t.operationDefinition({
        operation: OperationTypeNode.QUERY,
        name: `${surface.filesType}DownloadUrlQuery`,
        variableDefinitions: [
          t.variableDefinition({
            variable: t.variable({ name: 'id' }),
            type: t.nonNullType({ type: t.namedType({ type: 'UUID' }) }),
          }),
        ],
        selectionSet: t.selectionSet({
          selections: [
            t.field({
              name: nodeField,
              args: [t.argument({ name: 'id', value: t.variable({ name: 'id' }) })],
              selectionSet: t.selectionSet({
                selections: [t.field({ name: 'id' }), t.field({ name: surface.downloadUrlField })],
              }),
            }),
          ],
        }),
      }),
    ],
  });

  return print(ast);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
